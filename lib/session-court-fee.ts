import prisma from '@/lib/prisma';
import { addMinutesToTimeHm, priceForTimeInVenue, type PricingTableLite } from '@/lib/pricing';

/**
 * Court share for a session: prefer persisted TimeSlot rows for the linked court; else sum venue JSON pricing.
 */
export async function computeCourtFeeVnd(params: {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  use30MinSlots: boolean;
  pricingTables: PricingTableLite[];
  dateOverrides: { date: string; dayType: string }[];
}): Promise<number> {
  const { courtId, date, startTime, endTime, use30MinSlots, pricingTables, dateOverrides } = params;

  const slotRows = await prisma.timeSlot.findMany({
    where: {
      courtId,
      date,
      time: { gte: startTime, lt: endTime },
    },
    select: { price: true },
  });

  if (slotRows.length > 0) {
    return slotRows.reduce((s, r) => s + r.price, 0);
  }

  let total = 0;
  const step = use30MinSlots ? 30 : 60;
  let t = startTime;
  for (let i = 0; i < 64 && t < endTime; i++) {
    const hit = priceForTimeInVenue(pricingTables, dateOverrides, date, t);
    if (hit) {
      total += use30MinSlots ? hit.walkIn : hit.walkIn * 2;
    }
    t = addMinutesToTimeHm(t, step);
  }
  return total;
}

export function sessionDurationHours(startTime: string, endTime: string): number {
  const toMin = (hm: string) => {
    const [h, m] = hm.split(':').map((x) => parseInt(x, 10));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
  };
  const a = toMin(startTime);
  const b = toMin(endTime);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  let diff = b - a;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}
