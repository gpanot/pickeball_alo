import type { PrismaClient } from '@/lib/generated/prisma/client';
import { addMinutesToTimeHm, priceForTimeInVenue } from '@/lib/pricing';

export type BookingSlotJson = {
  courtName: string;
  time: string;
  /** Minutes per line item; 60 with hourly UI reserves two underlying 30-minute rows. */
  duration: number;
};

/** JSON stored on Booking.slots (player + admin flows). */
export function parseBookingSlots(slots: unknown): BookingSlotJson[] {
  if (!Array.isArray(slots)) return [];
  const out: BookingSlotJson[] = [];
  for (const x of slots) {
    if (x && typeof x === 'object' && 'courtName' in x && 'time' in x) {
      const o = x as { courtName: unknown; time: unknown; duration?: unknown };
      let duration = 30;
      if (typeof o.duration === 'number' && Number.isFinite(o.duration) && o.duration > 0) {
        duration = Math.round(o.duration);
      }
      out.push({
        courtName: String(o.courtName),
        time: String(o.time),
        duration,
      });
    }
  }
  return out;
}

type Tx = Pick<PrismaClient, 'court' | 'timeSlot' | 'venue'>;

/**
 * Resolve booking slot rows to TimeSlot ids; upsert rows from venue pricing when missing.
 */
export async function resolveSlotIdsForReserve(
  db: Tx,
  venueId: string,
  date: string,
  slotsJson: unknown,
): Promise<{ ok: true; slotIds: string[] } | { ok: false; status: 400 | 409; message: string }> {
  const rows = parseBookingSlots(slotsJson);
  if (rows.length === 0) {
    return { ok: false, status: 400, message: 'No valid slots in booking' };
  }

  const venue = await db.venue.findUnique({
    where: { id: venueId },
    include: {
      pricingTables: { orderBy: { sortOrder: 'asc' } },
      dateOverrides: true,
    },
  });
  if (!venue) {
    return { ok: false, status: 400, message: 'Venue not found' };
  }

  const pricingLite = venue.pricingTables.map((t) => ({
    dayTypes: t.dayTypes,
    sortOrder: t.sortOrder,
    rows: t.rows,
  }));

  const courts = await db.court.findMany({
    where: { venueId },
    select: { id: true, name: true, isAvailable: true },
  });
  const byName = new Map(courts.map((c) => [c.name, c]));

  const slotIds: string[] = [];
  const seenIds = new Set<string>();

  for (const row of rows) {
    const court = byName.get(row.courtName);
    if (!court) {
      return { ok: false, status: 400, message: `Unknown court: ${row.courtName}` };
    }
    if (!court.isAvailable) {
      return { ok: false, status: 409, message: `Court unavailable: ${row.courtName}` };
    }

    const reserveTimes: string[] =
      row.duration >= 60 ? [row.time, addMinutesToTimeHm(row.time, 30)] : [row.time];

    for (const tm of reserveTimes) {
      const p = priceForTimeInVenue(pricingLite, venue.dateOverrides, date, tm);
      if (!p) {
        return {
          ok: false,
          status: 400,
          message: `No pricing for ${row.courtName} at ${tm} on ${date}`,
        };
      }

      const memberPrice = venue.hasMemberPricing ? p.member : null;

      const slot = await db.timeSlot.upsert({
        where: {
          courtId_date_time: { courtId: court.id, date, time: tm },
        },
        create: {
          courtId: court.id,
          date,
          time: tm,
          price: p.walkIn,
          memberPrice,
          isBooked: false,
        },
        update: {
          price: p.walkIn,
          memberPrice,
        },
      });

      if (slot.isBooked) {
        return {
          ok: false,
          status: 409,
          message: `Slot already booked: ${row.courtName} ${tm}`,
        };
      }
      if (seenIds.has(slot.id)) {
        return { ok: false, status: 400, message: 'Duplicate slot in request' };
      }
      seenIds.add(slot.id);
      slotIds.push(slot.id);
    }
  }

  return { ok: true, slotIds };
}

export async function markSlotsBooked(db: Tx, slotIds: string[], isBooked: boolean) {
  await db.timeSlot.updateMany({
    where: { id: { in: slotIds } },
    data: { isBooked },
  });
}

export async function freeSlotsForBooking(
  db: Tx,
  venueId: string,
  date: string,
  slotsJson: unknown,
): Promise<void> {
  const rows = parseBookingSlots(slotsJson);
  if (rows.length === 0) return;

  const courts = await db.court.findMany({
    where: { venueId },
    select: { id: true, name: true },
  });
  const byName = new Map(courts.map((c) => [c.name, c]));

  for (const row of rows) {
    const court = byName.get(row.courtName);
    if (!court) continue;
    const times: string[] =
      row.duration >= 60 ? [row.time, addMinutesToTimeHm(row.time, 30)] : [row.time];
    for (const tm of times) {
      await db.timeSlot.updateMany({
        where: { courtId: court.id, date, time: tm },
        data: { isBooked: false },
      });
    }
  }
}
