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

export function formatDateLabel(d: Date): { day: string; date: string } {
  return { day: DAYS[d.getDay()], date: `${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

/** UTC calendar day — can disagree with the date the user sees in local time. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD in the user's local timezone (matches date chips in the UI). */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Minutes from midnight for sorting; `00:00` sorts after 23:30 (end-of-day midnight slot). */
export function timeStringToSortMinutes(time: string): number {
  const [hs, ms] = time.split(':');
  const h = parseInt(hs ?? '', 10);
  const m = parseInt(ms ?? '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 99999;
  if (h === 0 && m === 0) return 24 * 60;
  return h * 60 + m;
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

/** Clock hour 0–23 for labels */
export function formatClockHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/** Full-hour start options: 5 AM … 11 PM, then midnight (12 AM, hour 0). Matches search `selectedTime` index. */
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
