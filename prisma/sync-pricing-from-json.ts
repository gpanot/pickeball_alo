/**
 * Overwrite PricingTable rows from public/courts.json for each DB venue that matches
 * JSON by name + lat/lng. Regenerates TimeSlots for the same 8-day window as seed;
 * preserves isBooked flags when the same court/date/time still exists after pricing change.
 */
import { config } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '../lib/generated/prisma/client.js';
import { computeCourtSlots } from '../lib/venue-slots';
import {
  type CourtJsonRow,
  extractPriceRangeVnd,
  legacyTablesToStructured,
  parseLegacyTables,
} from '../lib/json-venue-pricing';

config({ path: path.join(process.cwd(), '.env.local') });
config();

const prisma = new PrismaClient();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function futureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const jsonPath = path.join(process.cwd(), 'public', 'courts.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Missing ${jsonPath}`);
    process.exit(1);
  }
  const rows: CourtJsonRow[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const jsonList = rows
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

  const venues = await prisma.venue.findMany({
    include: {
      courts: { select: { id: true, name: true, note: true, isAvailable: true } },
      dateOverrides: true,
    },
  });

  const byName = new Map<string, typeof venues>();
  for (const v of venues) {
    const list = byName.get(v.name) ?? [];
    list.push(v);
    byName.set(v.name, list);
  }

  function matchVenue(jv: { name: string; latitude: number; longitude: number }) {
    const cands = byName.get(jv.name) ?? [];
    for (const v of cands) {
      if (Math.abs(v.lat - jv.latitude) < 1e-4 && Math.abs(v.lng - jv.longitude) < 1e-4) {
        return v;
      }
    }
    return null;
  }

  const dates: string[] = [todayStr()];
  for (let d = 1; d <= 7; d++) dates.push(futureDateStr(d));

  let updated = 0;
  let skipped = 0;

  type SlotRow = {
    courtId: string;
    date: string;
    time: string;
    price: number;
    memberPrice: number | null;
    isBooked: boolean;
  };

  for (const jv of jsonList) {
    const venue = matchVenue(jv);
    if (!venue) {
      skipped++;
      continue;
    }

    const [priceMin, priceMax] = extractPriceRangeVnd(jv);
    const mid = Math.round((priceMin + priceMax) / 2);
    const legacy = parseLegacyTables(jv);
    const { tables: structTables, hasMember } = legacyTablesToStructured(legacy, mid);

    const courtIds = venue.courts.map((c) => c.id);

    const existingSlots = await prisma.timeSlot.findMany({
      where: { courtId: { in: courtIds }, date: { in: dates } },
      select: { courtId: true, date: true, time: true, isBooked: true },
    });
    const booked = new Set(
      existingSlots.filter((s) => s.isBooked).map((s) => `${s.courtId}|${s.date}|${s.time}`),
    );

    await prisma.$transaction(async (tx) => {
      await tx.pricingTable.deleteMany({ where: { venueId: venue.id } });
      await tx.pricingTable.createMany({
        data: structTables.map((t, i) => ({
          venueId: venue.id,
          name: t.name,
          dayTypes: t.dayTypes,
          rows: t.rows,
          sortOrder: i,
        })),
      });
      await tx.timeSlot.deleteMany({
        where: { courtId: { in: courtIds }, date: { in: dates } },
      });
      await tx.venue.update({
        where: { id: venue.id },
        data: {
          priceMin,
          priceMax,
          hasMemberPricing: hasMember,
        },
      });
    });

    const fresh = await prisma.venue.findUniqueOrThrow({
      where: { id: venue.id },
      include: {
        pricingTables: { orderBy: { sortOrder: 'asc' } },
        dateOverrides: true,
        courts: { select: { id: true, name: true, note: true, isAvailable: true } },
      },
    });

    const pricingLite = fresh.pricingTables.map((t) => ({
      dayTypes: t.dayTypes,
      sortOrder: t.sortOrder,
      rows: t.rows,
    }));

    const slotBatch: SlotRow[] = [];
    const SLOT_CHUNK = 4_000;
    const flush = async () => {
      if (slotBatch.length === 0) return;
      await prisma.timeSlot.createMany({ data: slotBatch });
      slotBatch.length = 0;
    };

    for (const date of dates) {
      for (const court of fresh.courts) {
        const slots = computeCourtSlots(court, date, pricingLite, fresh.dateOverrides, new Map(), {
          forPersistence: true,
        });
        for (const s of slots) {
          slotBatch.push({
            courtId: court.id,
            date,
            time: s.time,
            price: s.price,
            memberPrice: hasMember ? (s.memberPrice ?? null) : null,
            isBooked: booked.has(`${court.id}|${date}|${s.time}`),
          });
          if (slotBatch.length >= SLOT_CHUNK) await flush();
        }
      }
    }
    await flush();

    updated++;
    if (updated % 200 === 0) console.log(`  … ${updated} venues updated`);
  }

  console.log(`Done. Updated ${updated} venues (${skipped} JSON rows had no DB match).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
