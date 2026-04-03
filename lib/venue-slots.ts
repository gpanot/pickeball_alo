import {
  addMinutesToTimeHm,
  expandPricingRowsToHalfHours,
  expandPricingRowsToHourSlots,
  pickPricingTableForDate,
  type PricingTableLite,
} from '@/lib/pricing';
import type { SlotResult } from '@/lib/types';
import { prisma } from '@/lib/prisma';

export type BookStateRow = {
  id: string;
  isBooked: boolean;
  price: number;
  memberPrice: number | null;
};

export async function loadSlotBookStateForCourts(
  courtIds: string[],
  date: string,
): Promise<Map<string, BookStateRow>> {
  const map = new Map<string, BookStateRow>();
  if (courtIds.length === 0) return map;
  const rows = await prisma.timeSlot.findMany({
    where: { date, courtId: { in: courtIds } },
    select: {
      id: true,
      courtId: true,
      time: true,
      isBooked: true,
      price: true,
      memberPrice: true,
    },
  });
  for (const r of rows) {
    map.set(`${r.courtId}|${r.time}`, {
      id: r.id,
      isBooked: r.isBooked,
      price: r.price,
      memberPrice: r.memberPrice,
    });
  }
  return map;
}

export async function loadVenueSlotBookState(
  venueId: string,
  date: string,
): Promise<Map<string, BookStateRow>> {
  const rows = await prisma.timeSlot.findMany({
    where: { date, court: { venueId } },
    select: {
      id: true,
      courtId: true,
      time: true,
      isBooked: true,
      price: true,
      memberPrice: true,
    },
  });
  const map = new Map<string, BookStateRow>();
  for (const r of rows) {
    map.set(`${r.courtId}|${r.time}`, {
      id: r.id,
      isBooked: r.isBooked,
      price: r.price,
      memberPrice: r.memberPrice,
    });
  }
  return map;
}

export type ComputeCourtSlotsOptions = {
  /**
   * false = player sees one slot per clock hour at the full hourly rate; booked if either
   * underlying 30-minute row is booked. Ignored when `forPersistence` is true.
   */
  use30MinSlots?: boolean;
  /** Seed/sync: always emit the 30-minute grid for `TimeSlot` rows. */
  forPersistence?: boolean;
};

export function computeCourtSlots(
  court: { id: string; name: string; note: string | null; isAvailable: boolean },
  date: string,
  pricingTables: PricingTableLite[],
  dateOverrides: { date: string; dayType: string }[],
  bookState: Map<string, BookStateRow>,
  options?: ComputeCourtSlotsOptions,
): SlotResult[] {
  if (!court.isAvailable) return [];
  const picked = pickPricingTableForDate(pricingTables, date, dateOverrides);
  if (!picked) return [];

  const persist = options?.forPersistence === true;
  const use30 = persist ? true : options?.use30MinSlots !== false;

  if (use30) {
    const half = expandPricingRowsToHalfHours(picked);
    return half.map((slot) => {
      const key = `${court.id}|${slot.time}`;
      const db = bookState.get(key);
      return {
        id: db?.id ?? `pending:${court.id}:${date}:${slot.time}`,
        time: slot.time,
        price: slot.walkIn,
        memberPrice: slot.member,
        isBooked: db?.isBooked ?? false,
      };
    });
  }

  const hours = expandPricingRowsToHourSlots(picked);
  return hours.map((slot) => {
    const t1 = addMinutesToTimeHm(slot.time, 30);
    const k0 = `${court.id}|${slot.time}`;
    const k1 = `${court.id}|${t1}`;
    const db0 = bookState.get(k0);
    const db1 = bookState.get(k1);
    const isBooked = Boolean(db0?.isBooked || db1?.isBooked);
    const id = db0?.id ?? db1?.id ?? `pending:${court.id}:${date}:${slot.time}:h`;
    return {
      id,
      time: slot.time,
      price: slot.walkIn,
      memberPrice: slot.member,
      isBooked,
    };
  });
}
