/**
 * Converts raw AloBo booking/schedule/lock data into a flat list of
 * 30-minute slot markers that can be overlaid on our availability grid.
 * Isolated module: safe to delete without affecting the rest of the app.
 */
import type { AloboBooking, AloboLockedYard } from './client';

export interface AloboSlotOverlay {
  courtAloboId: string;
  time: string;
  source: 'booking' | 'schedule' | 'locked';
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function extractHhmm(isoish: string): string {
  const t = isoish.includes('T') ? isoish.split('T')[1] : isoish;
  return t.slice(0, 5);
}

function expandTo30MinSlots(
  courtId: string,
  startHhmm: string,
  durationMin: number,
  source: AloboSlotOverlay['source'],
): AloboSlotOverlay[] {
  const slots: AloboSlotOverlay[] = [];
  for (let offset = 0; offset < durationMin; offset += 30) {
    slots.push({
      courtAloboId: courtId,
      time: addMinutes(startHhmm, offset),
      source,
    });
  }
  return slots;
}

function diffMinutes(startHhmm: string, endHhmm: string): number {
  const [sh, sm] = startHhmm.split(':').map(Number);
  const [eh, em] = endHhmm.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function convertBookingsToOverlay(
  bookings: AloboBooking[],
  source: 'booking' | 'schedule',
  dateFilter?: string,
): AloboSlotOverlay[] {
  const slots: AloboSlotOverlay[] = [];
  for (const b of bookings) {
    for (const s of b.services) {
      if (dateFilter && !s.startTime.startsWith(dateFilter)) continue;
      const start = extractHhmm(s.startTime);
      slots.push(...expandTo30MinSlots(s.serviceId, start, s.duration, source));
    }
  }
  return slots;
}

export function convertLocksToOverlay(
  locks: AloboLockedYard[],
  dateFilter?: string,
): AloboSlotOverlay[] {
  const slots: AloboSlotOverlay[] = [];
  for (const l of locks) {
    if (dateFilter && !l.startTime.startsWith(dateFilter)) continue;
    const start = extractHhmm(l.startTime);
    const end = extractHhmm(l.endTime);
    const dur = diffMinutes(start, end);
    if (dur <= 0) continue;
    for (const courtId of l.servicesId) {
      slots.push(...expandTo30MinSlots(courtId, start, dur, 'locked'));
    }
  }
  return slots;
}

/**
 * Build a Set of "courtName|HH:MM" keys from AloBo overlay data,
 * using an aloboId→courtName mapping.
 */
export function overlayToKeySet(
  overlays: AloboSlotOverlay[],
  aloboIdToCourtName: Map<string, string>,
): Set<string> {
  const keys = new Set<string>();
  for (const o of overlays) {
    const name = aloboIdToCourtName.get(o.courtAloboId);
    if (name) keys.add(`${name}|${o.time}`);
  }
  return keys;
}
