/**
 * CourtMap structured pricing (CourtMap_Courts_Pricing_Spec.md):
 * Table rows store **hourly** walk-in (and optional member) rates; expansion produces per-slot
 * charges (half-hourly = hourly ÷ 2).
 */

export type PricingRow = {
  startTime: string;
  endTime: string;
  walkIn: number;
  member: number | null;
};

export type Dow =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type PricingTableLite = {
  dayTypes: string[];
  sortOrder: number;
  rows: unknown;
};

export function getDowFromDateKey(dateStr: string): Dow {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const utc = Date.UTC(y, mo - 1, d);
  const day = new Date(utc).getUTCDay();
  const map: Dow[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[day]!;
}

/** Effective type for table matching: override wins; else weekend vs weekday. */
export function resolveEffectiveDayType(
  dateStr: string,
  overrides: readonly { date: string; dayType: string }[],
): string {
  const hit = overrides.find((o) => o.date === dateStr);
  if (hit) return hit.dayType;
  const dow = getDowFromDateKey(dateStr);
  return dow === 'saturday' || dow === 'sunday' ? 'weekend' : 'weekday';
}

export function tableMatchesForDate(
  dayTypes: string[],
  effectiveType: string,
  dow: Dow,
): boolean {
  if (dayTypes.length === 0) return false;
  if (dayTypes.includes(effectiveType)) return true;
  if (dayTypes.includes(dow)) return true;
  if (dayTypes.includes('weekday')) {
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(dow)) return true;
  }
  if (dayTypes.includes('weekend')) {
    if (dow === 'saturday' || dow === 'sunday') return true;
  }
  return false;
}

export function parsePricingRows(json: unknown): PricingRow[] {
  if (!Array.isArray(json)) return [];
  const out: PricingRow[] = [];
  for (const x of json) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const st = typeof o.startTime === 'string' ? o.startTime : '';
    const et = typeof o.endTime === 'string' ? o.endTime : '';
    const w = Number(o.walkIn);
    if (!st || !et || !Number.isFinite(w)) continue;
    let m: number | null = null;
    if (o.member != null && o.member !== '') {
      const mv = Number(o.member);
      if (Number.isFinite(mv)) m = Math.round(mv);
    }
    out.push({ startTime: st, endTime: et, walkIn: Math.round(w), member: m });
  }
  return out;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((v) => parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Add minutes to an `HH:mm` time (same calendar day; wraps past midnight). */
export function addMinutesToTimeHm(time: string, deltaMin: number): string {
  const base = timeToMinutes(time);
  if (!Number.isFinite(deltaMin) || base < 0) return time;
  let m = base + deltaMin;
  const day = 24 * 60;
  while (m < 0) m += day;
  while (m >= day) m -= day;
  return minutesToTime(m);
}

/**
 * 30-minute slot starts within [row.start, row.end), price = half of the row’s hourly rate.
 * Overlapping rows: first occurrence of a time wins (same as before).
 */
export function expandPricingRowsToHalfHours(
  rows: PricingRow[],
): { time: string; walkIn: number; member: number | null }[] {
  const seen = new Set<string>();
  const list: { time: string; walkIn: number; member: number | null }[] = [];
  for (const row of rows) {
    const start = timeToMinutes(row.startTime);
    const end = timeToMinutes(row.endTime);
    if (start < 0 || end < 0 || start >= end) continue;
    const walkHalf = Math.round(row.walkIn / 2);
    const memHalf =
      row.member != null && Number.isFinite(row.member) ? Math.round(row.member / 2) : null;
    for (let t = start; t < end; t += 30) {
      const timeStr = minutesToTime(t);
      if (seen.has(timeStr)) continue;
      seen.add(timeStr);
      list.push({
        time: timeStr,
        walkIn: walkHalf,
        member: memHalf,
      });
    }
  }
  list.sort((a, b) => a.time.localeCompare(b.time));
  return list;
}

/** Full-hour slot starts: first boundary at or after row start, each [t, t+60) ⊆ [start,end). */
export function expandPricingRowsToHourSlots(
  rows: PricingRow[],
): { time: string; walkIn: number; member: number | null }[] {
  const seen = new Set<string>();
  const list: { time: string; walkIn: number; member: number | null }[] = [];
  for (const row of rows) {
    let start = timeToMinutes(row.startTime);
    const end = timeToMinutes(row.endTime);
    if (start < 0 || end < 0 || start >= end) continue;
    if (start % 60 !== 0) start = start + (60 - (start % 60));
    for (let t = start; t + 60 <= end; t += 60) {
      const timeStr = minutesToTime(t);
      if (seen.has(timeStr)) continue;
      seen.add(timeStr);
      list.push({
        time: timeStr,
        walkIn: row.walkIn,
        member: row.member,
      });
    }
  }
  list.sort((a, b) => a.time.localeCompare(b.time));
  return list;
}

export function pickPricingTableForDate(
  tables: PricingTableLite[],
  dateStr: string,
  overrides: readonly { date: string; dayType: string }[],
): PricingRow[] | null {
  const effective = resolveEffectiveDayType(dateStr, overrides);
  const dow = getDowFromDateKey(dateStr);
  const sorted = [...tables].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const tbl of sorted) {
    if (!tableMatchesForDate(tbl.dayTypes, effective, dow)) continue;
    const pr = parsePricingRows(tbl.rows);
    if (pr.length > 0) return pr;
  }
  return null;
}

export function priceForTimeInVenue(
  pricingTables: PricingTableLite[],
  dateOverrides: readonly { date: string; dayType: string }[],
  date: string,
  time: string,
): { walkIn: number; member: number | null } | null {
  const picked = pickPricingTableForDate(pricingTables, date, dateOverrides);
  if (!picked) return null;
  const half = expandPricingRowsToHalfHours(picked);
  const hit = half.find((s) => s.time === time);
  if (!hit) return null;
  return { walkIn: hit.walkIn, member: hit.member };
}

/** Human label for player Pricing tab subtitle. */
export function formatDayTypesSubtitle(dayTypes: string[]): string {
  const set = new Set(dayTypes.map((d) => d.toLowerCase()));
  if (set.has('weekday') && !set.has('weekend') && !set.has('saturday'))
    return 'Monday to Friday';
  if (set.has('weekend') || (set.has('saturday') && set.has('sunday')))
    return 'Saturday, Sunday, public holidays';
  if (set.has('holiday')) return 'Holidays and special dates';
  if (set.has('saturday') || set.has('sunday'))
    return dayTypes.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  return dayTypes.join(', ');
}
