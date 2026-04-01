/**
 * Imports venues from `public/courts.json` (alobo export, ~2k pickleball locations).
 *
 * - Default: loads **all** rows (full migration). Takes several minutes.
 * - Faster / HCMC-only: `SEED_RADIUS_KM=25 npx prisma db seed` (~400 venues near default map center).
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '../lib/generated/prisma/client.js';

const prisma = new PrismaClient();

/** HCMC reference (same as API default). Used only when SEED_RADIUS_KM is set. */
const REF_LAT = 10.79;
const REF_LNG = 106.71;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function futureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/** Half-hour slots 05:00–23:30 plus 00:00 (midnight); prices in VND. */
function buildStandardSlots(priceMidVnd: number): { time: string; price: number }[] {
  const out: { time: string; price: number }[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const peak = h >= 17 && h <= 20 ? 15_000 : h <= 8 ? -3_000 : 4_000;
      const bump = ((h * 2 + (m === 30 ? 1 : 0)) % 5) * 2_000;
      const price = Math.max(15_000, priceMidVnd + peak + bump);
      out.push({ time, price });
    }
  }
  out.push({ time: '00:00', price: Math.max(15_000, priceMidVnd + 8_000) });
  return out;
}

const SLOTS_PER_COURT_PER_DAY = buildStandardSlots(80_000).length;

interface CourtJsonRow {
  name: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  phone?: string;
  hours?: string;
  rating: number | null;
  ratingCount?: number;
  sports?: string[];
  pricing_tables?: unknown;
  flat_prices?: unknown;
}

const DEFAULT_PRICE_MIN = 80_000;
const DEFAULT_PRICE_MAX = 120_000;

/** Pull VND amounts like 159.000 or 1.250.000 from pricing JSON strings. */
function extractPriceRangeVnd(v: CourtJsonRow): [number, number] {
  const blob = JSON.stringify([v.pricing_tables, v.flat_prices]);
  const re = /\d{1,3}(?:\.\d{3})+/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    const n = parseInt(m[0].replace(/\./g, ''), 10);
    if (n >= 15_000 && n <= 5_000_000) values.push(n);
  }
  if (values.length === 0) return [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX];
  return [Math.min(...values), Math.max(...values)];
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.timeSlot.deleteMany();
  await prisma.court.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.userProfile.deleteMany();

  const jsonPath = path.join(process.cwd(), 'public', 'courts.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Missing ${jsonPath} — cannot seed from alobo export.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const rows: CourtJsonRow[] = JSON.parse(raw);

  const radiusEnv = process.env.SEED_RADIUS_KM?.trim();
  const radiusKm =
    radiusEnv != null && radiusEnv !== '' ? parseFloat(radiusEnv) : Number.NaN;
  const filterByRadius = Number.isFinite(radiusKm) && radiusKm > 0;

  let list = rows
    .map((r) => {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      return { ...r, latitude: lat, longitude: lng };
    })
    .filter(
      (r) =>
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        (r.sports == null || r.sports.length === 0 || r.sports.includes('pickleball')),
    );

  if (filterByRadius) {
    const before = list.length;
    list = list.filter((r) => haversineKm(REF_LAT, REF_LNG, r.latitude, r.longitude) <= radiusKm);
    console.log(`SEED_RADIUS_KM=${radiusKm}: ${list.length} venues within radius (of ${before} pickleball rows).`);
  } else {
    console.log(`Importing all ${list.length} venues from courts.json (set SEED_RADIUS_KM for a smaller, faster seed).`);
  }

  const dates: string[] = [todayStr()];
  for (let d = 1; d <= 7; d++) dates.push(futureDateStr(d));

  type SlotRow = { courtId: string; date: string; time: string; price: number; isBooked: boolean };
  let slotBatch: SlotRow[] = [];
  const SLOT_CHUNK = 4_000;

  const flushSlots = async () => {
    if (slotBatch.length === 0) return;
    await prisma.timeSlot.createMany({ data: slotBatch });
    slotBatch = [];
  };

  let done = 0;
  for (const v of list) {
    const [priceMin, priceMax] = extractPriceRangeVnd(v);
    const mid = Math.round((priceMin + priceMax) / 2);

    const created = await prisma.venue.create({
      data: {
        name: v.name.slice(0, 240),
        address: v.address.slice(0, 500),
        lat: v.latitude,
        lng: v.longitude,
        phone: v.phone ? String(v.phone).slice(0, 60) : null,
        hours: v.hours ? String(v.hours).slice(0, 120) : null,
        rating: v.rating,
        reviewCount: v.ratingCount ?? 0,
        priceMin,
        priceMax,
        tags: ['Pickleball'],
        amenities: [],
        images: [],
        courts: {
          create: [{ name: 'Court 1', note: null, isAvailable: true }],
        },
      },
      include: { courts: true },
    });

    const courtId = created.courts[0]!.id;
    const tmpl = buildStandardSlots(mid);

    for (const date of dates) {
      for (const s of tmpl) {
        slotBatch.push({
          courtId,
          date,
          time: s.time,
          price: s.price,
          isBooked: false,
        });
        if (slotBatch.length >= SLOT_CHUNK) await flushSlots();
      }
    }

    done++;
    if (done % 100 === 0) console.log(`  … ${done} / ${list.length} venues`);
  }

  await flushSlots();
  const approxSlots = list.length * dates.length * SLOTS_PER_COURT_PER_DAY;
  console.log(`Seed complete: ${list.length} venues, ${list.length} courts, ~${approxSlots} time slots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
