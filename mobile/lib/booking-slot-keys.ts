import { addMinutesToTimeHm } from '@/lib/pricing';
import type { BookingSlot } from '@/lib/types';

/** Build UI slot keys from stored booking lines (handles 60m = two half-hour cells). */
export function bookingSlotsToSelectedKeys(slots: BookingSlot[]): Set<string> {
  const set = new Set<string>();
  for (const s of slots) {
    const duration = typeof s.duration === 'number' && s.duration > 0 ? s.duration : 30;
    const times = duration >= 60 ? [s.time, addMinutesToTimeHm(s.time, 30)] : [s.time];
    for (const tm of times) {
      set.add(`${s.courtName}|${tm}`);
    }
  }
  return set;
}
