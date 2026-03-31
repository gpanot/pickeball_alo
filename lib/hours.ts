import type { CourtRaw } from './types';

function tokenToMinutes(tok: string): number | null {
  if (!tok) return null;
  const s = String(tok).trim().toLowerCase();
  const colon = s.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  const hFormat = s.match(/^(\d{1,2})h(\d{2})$/);
  if (hFormat) return parseInt(hFormat[1], 10) * 60 + parseInt(hFormat[2], 10);
  const hOnly = s.match(/^(\d{1,2})h$/);
  if (hOnly) return parseInt(hOnly[1], 10) * 60;
  const hourOnly = s.match(/^(\d{1,2})$/);
  if (hourOnly) return parseInt(hourOnly[1], 10) * 60;
  return null;
}

function normalizeTimePart(part: string): string {
  let p = String(part).trim().toLowerCase().replace(/h/g, ':');
  if (!p.includes(':')) return `${p}:00`;
  if (p.endsWith(':')) return `${p}00`;
  return p;
}

export function parseVenueHours(
  str: string | undefined
): { open: number; close: number } | null {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(
    /(\d{1,2}(?::\d{2}|h\d{0,2})?)\s*-\s*(\d{1,2}(?::\d{2}|h\d{0,2})?)/i
  );
  if (!m) return null;
  const open = tokenToMinutes(normalizeTimePart(m[1]));
  const close = tokenToMinutes(normalizeTimePart(m[2]));
  if (open == null || close == null) return null;
  if (close <= open) return null;
  return { open, close };
}

/** true = inside hours, false = outside, null = unknown */
export function venueCoversSlot(
  venue: CourtRaw,
  slotStartMin: number,
  durationMin: number
): boolean | null {
  const r = parseVenueHours(venue.hours);
  if (!r) return null;
  const end = slotStartMin + durationMin;
  return r.open <= slotStartMin && end <= r.close;
}
