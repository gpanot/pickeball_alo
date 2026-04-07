/**
 * Imports venues from `public/courts.json`.
 * Pricing: structured PricingTable rows (spec) + TimeSlots generated from them.
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  type CourtJsonRow,
  extractPriceRangeVnd,
  legacyTablesToStructured,
  parseLegacyTables,
} from '../lib/json-venue-pricing';
import { computeCourtSlots } from '../lib/venue-slots';
import { PrismaClient } from '@prisma/client';

const DEFAULT_ADMIN_PIN = '1234';
const adminPinHash = bcrypt.hashSync(DEFAULT_ADMIN_PIN, 10);

const prisma = new PrismaClient();

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

async function main() {
  console.log('Clearing existing data...');
  await prisma.timeSlot.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.dateOverride.deleteMany();
  await prisma.pricingTable.deleteMany();
  await prisma.venuePayment.deleteMany();
  await prisma.court.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.userProfile.deleteMany();

  const jsonPath = path.join(process.cwd(), 'public', 'courts.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Missing ${jsonPath}`);
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
    console.log(`SEED_RADIUS_KM=${radiusKm}: ${list.length} venues (of ${before}).`);
  } else {
    console.log(`Importing ${list.length} venues.`);
  }

  const dates: string[] = [todayStr()];
  for (let d = 1; d <= 7; d++) dates.push(futureDateStr(d));

  type SlotRow = {
    courtId: string;
    date: string;
    time: string;
    price: number;
    memberPrice: number | null;
    isBooked: boolean;
  };
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

    const legacy = parseLegacyTables(v);
    const { tables: structTables, hasMember } = legacyTablesToStructured(legacy, mid);

    const aloboSlug = v.url
      ? v.url.replace(/.*\/dat-lich\//, '').replace(/\/$/, '') || null
      : null;

    const courtNames =
      Array.isArray(v.courts) && v.courts.length > 0
        ? v.courts.map((c) => ({
            name: String(c.name).slice(0, 120),
            note: null,
            isAvailable: true,
            aloboId: c.id ? String(c.id) : null,
          }))
        : [{ name: 'Court 1', note: null, isAvailable: true, aloboId: null }];

    const paymentRecords =
      Array.isArray(v.payments) && v.payments.length > 0
        ? v.payments.map((p, pi) => ({
            bank: String(p.bank || '').slice(0, 120),
            accountName: String(p.accountName || '').slice(0, 200),
            accountNumber: String(p.accountNumber || '').slice(0, 60),
            qrImageUrl: p.qr ? String(p.qr).slice(0, 500) : null,
            bankBin: pi === 0 ? '970422' : null,
            isDefaultForDynamicQr: pi === 0,
            sortOrder: pi,
          }))
        : [];

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
        adminPin: adminPinHash,
        hasMemberPricing: hasMember,
        aloboSlug,
        courts: { create: courtNames },
        pricingTables: {
          create: structTables.map((t, i) => ({
            name: t.name,
            dayTypes: t.dayTypes,
            rows: t.rows,
            sortOrder: i,
          })),
        },
        payments: paymentRecords.length > 0 ? { create: paymentRecords } : undefined,
      },
      include: { courts: true, pricingTables: { orderBy: { sortOrder: 'asc' } }, dateOverrides: true },
    });

    const pricingLite = created.pricingTables.map((t) => ({
      dayTypes: t.dayTypes,
      sortOrder: t.sortOrder,
      rows: t.rows,
    }));

    for (const date of dates) {
      for (const court of created.courts) {
        const slots = computeCourtSlots(
          {
            id: court.id,
            name: court.name,
            note: court.note,
            isAvailable: court.isAvailable,
          },
          date,
          pricingLite,
          created.dateOverrides,
          new Map(),
          { forPersistence: true },
        );
        for (const s of slots) {
          slotBatch.push({
            courtId: court.id,
            date,
            time: s.time,
            price: s.price,
            memberPrice: hasMember ? (s.memberPrice ?? null) : null,
            isBooked: false,
          });
          if (slotBatch.length >= SLOT_CHUNK) await flushSlots();
        }
      }
    }

    done++;
    if (done % 100 === 0) console.log(`  … ${done} / ${list.length} venues`);
  }

  await flushSlots();
  console.log(`Seed complete: ${list.length} venues, structured pricing, time slots from pricing rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
