import type { VenueResult } from './types';

/** Map/list label; capped so display stays within 4 chars (e.g. `999k`). */
export function formatPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  const k = Math.min(999, Math.max(0, Math.round(p / 1000)));
  return `${k}k`;
}

/** 0 = budget, 1 = mid, 2 = premium (VND `priceMin` from API / DB). */
export type MapPriceTier = 0 | 1 | 2;

export function mapPriceTierFromVnd(priceMin: number | null | undefined): MapPriceTier {
  if (priceMin == null || !Number.isFinite(priceMin)) return 1;
  if (priceMin < 100_000) return 0;
  if (priceMin < 200_000) return 1;
  return 2;
}

export function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—';
  if (min === max || max == null) return `${formatPrice(min)}/hour`;
  if (min == null) return `${formatPrice(max)}/hour`;
  return `${formatPrice(min)} to ${formatPrice(max)}/hour`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateShort(d: Date): string {
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function parseFriendlyDateInput(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = value.trim();
  if (!raw) return null;

  // Keep YYYY-MM-DD stable across timezones by constructing a local Date.
  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const year = Number(isoDateOnly[1]);
    const month = Number(isoDateOnly[2]);
    const day = Number(isoDateOnly[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateFriendly(value: string | Date | null | undefined): string {
  if (value == null) return '—';
  const parsed = parseFriendlyDateInput(value);
  if (!parsed) return typeof value === 'string' ? value : '—';
  return formatDateShort(parsed);
}

export function formatDateLabel(d: Date): { day: string; date: string } {
  return { day: DAYS[d.getDay()], date: `${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatBookingOrderRef(orderId: string): string {
  const short = orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return short ? `CM-${short}` : orderId;
}

export function formatVndFull(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;
}

export function timeStringToSortMinutes(time: string): number {
  const [hs, ms] = time.split(':');
  const h = parseInt(hs ?? '', 10);
  const m = parseInt(ms ?? '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 99999;
  if (h === 0 && m === 0) return 24 * 60;
  return h * 60 + m;
}

export function earliestSelectedSlotTime(
  selectedSlots: Set<string>,
  venueCourtNames: readonly string[],
): string | null {
  const courtSet = new Set(venueCourtNames);
  let bestM: number | null = null;
  let bestT: string | null = null;
  for (const key of selectedSlots) {
    const pipe = key.indexOf('|');
    if (pipe < 0) continue;
    const court = key.slice(0, pipe);
    const time = key.slice(pipe + 1);
    if (!courtSet.has(court)) continue;
    const tm = timeStringToSortMinutes(time);
    if (tm >= 99999) continue;
    if (bestM == null || tm < bestM) {
      bestM = tm;
      bestT = time;
    }
  }
  return bestT;
}

export function firstSlotIndexAtOrAfter<T extends { time: string }>(slots: T[], anchorTime: string): number {
  const anchor = timeStringToSortMinutes(anchorTime);
  if (anchor >= 99999) return 0;
  const idx = slots.findIndex((s) => timeStringToSortMinutes(s.time) >= anchor);
  return idx >= 0 ? idx : 0;
}

export function sortSlotsByTime<T extends { time: string }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => timeStringToSortMinutes(a.time) - timeStringToSortMinutes(b.time));
}

export function getNextDays(count: number): Date[] {
  const result: Date[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    result.push(d);
  }
  return result;
}

export const DURATIONS = ['1h', '1h30', '2h', '2h30', '3h'];
export const PERIODS = ['Morning', 'Noon', 'Afternoon', 'Night'] as const;

export function formatClockHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export const START_HOUR_OPTIONS: readonly { hour: number; label: string }[] = (() => {
  const out: { hour: number; label: string }[] = [];
  for (let h = 5; h <= 23; h += 1) {
    out.push({ hour: h, label: formatClockHourLabel(h) });
  }
  out.push({ hour: 0, label: '12 AM' });
  return out;
})();

export function getStartHourLabel(selectedTimeIndex: number): string {
  return START_HOUR_OPTIONS[selectedTimeIndex]?.label ?? '—';
}

export function getBookTimeShortLabel(selectedTimeIndex: number): string {
  const opt = START_HOUR_OPTIONS[selectedTimeIndex];
  if (!opt) return '';
  const h = opt.hour;
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

export function durationIndexToHalfHourCount(durationIndex: number): number {
  const d = DURATIONS[durationIndex] ?? '1h';
  const map: Record<string, number> = {
    '1h': 2,
    '1h30': 3,
    '2h': 4,
    '2h30': 5,
    '3h': 6,
  };
  return map[d] ?? 2;
}

function parseTimeParts(time: string): { hour: number; minute: number } | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function slotMinutesFromMidnight(time: string): number | null {
  const p = parseTimeParts(time);
  if (!p) return null;
  if (p.hour === 0 && p.minute === 0) return 24 * 60;
  return p.hour * 60 + p.minute;
}

function tryPickConsecutiveHourSlots(venue: VenueResult, startHour: number, hourCount: number): Set<string> {
  const out = new Set<string>();
  if (hourCount < 1) return out;

  for (const court of venue.courts) {
    const sorted = sortSlotsByTime(court.slots).filter((s) => !s.isBooked);
    const startIdx = sorted.findIndex((s) => {
      const p = parseTimeParts(s.time);
      return p && p.hour === startHour && p.minute === 0;
    });
    if (startIdx < 0) continue;

    const picked: typeof sorted = [];
    for (let i = 0; i < hourCount; i++) {
      const slot = sorted[startIdx + i];
      if (!slot || slot.isBooked) break;
      if (i > 0) {
        const prev = picked[picked.length - 1];
        const a = slotMinutesFromMidnight(prev.time);
        const b = slotMinutesFromMidnight(slot.time);
        if (a == null || b == null || b - a !== 60) break;
      }
      picked.push(slot);
    }
    if (picked.length === hourCount) {
      for (const s of picked) {
        out.add(`${court.name}|${s.time}`);
      }
      return out;
    }
  }
  return out;
}

function pickSingleHourSlotAtHour(venue: VenueResult, startHour: number): Set<string> {
  for (const court of venue.courts) {
    const sorted = sortSlotsByTime(court.slots).filter((s) => !s.isBooked);
    const s = sorted.find((sl) => {
      const p = parseTimeParts(sl.time);
      return p && p.hour === startHour && p.minute === 0;
    });
    if (s) return new Set([`${court.name}|${s.time}`]);
  }
  return new Set();
}

function tryPickConsecutiveFromAnchor(
  venue: VenueResult,
  startHour: number,
  startMinute: 0 | 30,
  halfHourCount: number,
): Set<string> {
  const out = new Set<string>();
  if (halfHourCount < 1) return out;

  for (const court of venue.courts) {
    const sorted = sortSlotsByTime(court.slots).filter((s) => !s.isBooked);
    const startIdx = sorted.findIndex((s) => {
      const p = parseTimeParts(s.time);
      return p && p.hour === startHour && p.minute === startMinute;
    });
    if (startIdx < 0) continue;

    const picked: typeof sorted = [];
    for (let i = 0; i < halfHourCount; i++) {
      const slot = sorted[startIdx + i];
      if (!slot || slot.isBooked) break;
      if (i > 0) {
        const prev = picked[picked.length - 1];
        const a = slotMinutesFromMidnight(prev.time);
        const b = slotMinutesFromMidnight(slot.time);
        if (a == null || b == null || b - a !== 30) break;
      }
      picked.push(slot);
    }
    if (picked.length === halfHourCount) {
      for (const s of picked) {
        out.add(`${court.name}|${s.time}`);
      }
      return out;
    }
  }
  return out;
}

function pickSingleSlotAtHour(venue: VenueResult, startHour: number): Set<string> {
  for (const court of venue.courts) {
    const sorted = sortSlotsByTime(court.slots).filter((s) => !s.isBooked);
    for (const minute of [0, 30] as const) {
      const s = sorted.find((sl) => {
        const p = parseTimeParts(sl.time);
        return p && p.hour === startHour && p.minute === minute;
      });
      if (s) return new Set([`${court.name}|${s.time}`]);
    }
  }
  return new Set();
}

export function pickSlotsForSearch(
  venue: VenueResult,
  startHour: number,
  halfHourCount: number,
): Set<string> {
  const use30 = venue.use30MinSlots !== false;
  if (!use30) {
    const hourCount = Math.max(1, Math.round(halfHourCount / 2));
    const run = tryPickConsecutiveHourSlots(venue, startHour, hourCount);
    if (run.size === hourCount) return run;
    return pickSingleHourSlotAtHour(venue, startHour);
  }

  const fromZero = tryPickConsecutiveFromAnchor(venue, startHour, 0, halfHourCount);
  if (fromZero.size === halfHourCount) return fromZero;

  if (halfHourCount > 1) {
    const fromThirty = tryPickConsecutiveFromAnchor(venue, startHour, 30, halfHourCount);
    if (fromThirty.size === halfHourCount) return fromThirty;
  }

  return pickSingleSlotAtHour(venue, startHour);
}

export const PERIOD_RANGES: Record<string, [number, number]> = {
  Morning: [5, 11],
  Noon: [11, 14],
  Afternoon: [14, 17],
  Night: [17, 23],
};

export const AMENITY_ICONS: Record<string, string> = {
  Parking: '🅿️',
  Water: '💧',
  Locker: '🔒',
  Lights: '💡',
  AC: '❄️',
  'Pro Shop': '🛍️',
  Cafe: '☕',
  Coaching: '🎓',
  Shower: '🚿',
  Pool: '🏊',
  Gym: '🏋️',
  Towel: '🧺',
};
