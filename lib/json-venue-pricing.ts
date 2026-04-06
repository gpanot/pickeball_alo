/**
 * Map AloBo `courts.json` legacy pricing grids → structured PricingTable rows (see lib/pricing.ts).
 * Handles a leading "Day" column (Mon-Fri / Sat-Sun + blank carry-over) by splitting into separate tables.
 */
import type { PricingRow } from '@/lib/pricing';

export interface CourtJsonRow {
  name: string;
  address: string;
  url?: string;
  latitude: number | string;
  longitude: number | string;
  phone?: string;
  hours?: string;
  rating: number | null;
  ratingCount?: number;
  sports?: string[];
  courtCount?: number;
  courts?: { id: string; name: string; status: number }[];
  pricing_tables?: unknown;
  pricing_table_names?: string[];
  flat_prices?: unknown;
  payments?: { bank: string; accountName: string; accountNumber: string; qr: string }[];
}

export interface LegacyTable {
  name: string;
  columns: string[];
  rows: string[][];
}

const COL_RENAME: Record<string, string> = {
  Price: 'Walk-in',
  Guest: 'Walk-in',
  Regular: 'Member',
};

export function parseLegacyTables(v: CourtJsonRow): LegacyTable[] {
  if (!Array.isArray(v.pricing_tables) || v.pricing_tables.length === 0) return [];
  const names = Array.isArray(v.pricing_table_names) ? v.pricing_table_names : [];
  const result: LegacyTable[] = [];

  for (let i = 0; i < v.pricing_tables.length; i++) {
    const table = v.pricing_tables[i];
    if (!Array.isArray(table) || table.length < 2) continue;
    const headerRow = table[0];
    if (!Array.isArray(headerRow)) continue;

    const columns = headerRow.map((h: unknown) => {
      const s = String(h ?? '');
      return COL_RENAME[s] ?? s;
    });

    const rows: string[][] = [];
    for (let r = 1; r < table.length; r++) {
      const raw = table[r];
      if (!Array.isArray(raw)) continue;
      rows.push(raw.map((c: unknown) => String(c ?? '')));
    }

    result.push({
      name: names[i] || 'Pricing',
      columns,
      rows,
    });
  }

  return result;
}

export function inferDayTypesFromTableName(name: string): string[] {
  const n = name.toLowerCase();
  if (/t2-t6|t2.*t6|thứ 2.*thứ 6|weekday|mon.*fri/i.test(n)) return ['weekday'];
  if (/t7-cn|t7.*cn|cuối tuần|weekend|thứ 7.*cn|sat.*sun/i.test(n)) return ['weekend'];
  if (/lễ|holiday|ngày lễ/i.test(n)) return ['holiday'];
  if (/\bt7\b|thứ 7|saturday/i.test(n)) return ['saturday'];
  if (/\bcn\b|chủ nhật|sunday/i.test(n)) return ['sunday'];
  if (/hàng ngày|tất cả|every day|daily/i.test(n)) return ['weekday', 'weekend'];
  return ['weekday', 'weekend'];
}

export function parseVndFromCell(s: string): number | null {
  const re = /\d{1,3}(?:\.\d{3})+/g;
  const m = s.match(re);
  if (!m?.length) return null;
  const n = parseInt(m[m.length - 1]!.replace(/\./g, ''), 10);
  return n >= 10_000 && n <= 10_000_000 ? n : null;
}

/** e.g. 6h-16h, 16h-22h → 06:00-16:00 */
export function parseTimeBand(cell: string): { start: string; end: string } | null {
  const t = cell.toLowerCase().replace(/\s/g, '');
  const m = t.match(/(\d{1,2})h(?:-(\d{1,2})h)?/);
  if (!m) return null;
  const h1 = Math.min(23, parseInt(m[1]!, 10));
  const h2 = m[2] != null ? Math.min(23, parseInt(m[2], 10)) : Math.min(23, h1 + 2);
  const start = `${String(h1).padStart(2, '0')}:00`;
  const end = `${String(Math.max(h1 + 1, h2)).padStart(2, '0')}:00`;
  return { start, end };
}

function parseDayCellToTypes(cell: string): string[] | null {
  const s = cell.trim();
  if (!s) return null;
  if (/mon\s*[-–]\s*fri|monday.*friday|t2\s*[-–]\s*t6|thứ\s*2.*thứ\s*6|^weekdays?$/i.test(s)) {
    return ['weekday'];
  }
  if (/sat\s*[-–]\s*sun|saturday.*sunday|t7\s*[-–]\s*cn|cuối\s*tuần|^weekends?$/i.test(s)) {
    return ['weekend'];
  }
  if (/holiday|lễ|ngày\s*lễ/i.test(s)) return ['holiday'];
  return inferDayTypesFromTableName(s);
}

function dayTypesKey(types: string[]): string {
  return [...types].sort().join('|');
}

function dayTypesShortLabel(types: string[]): string {
  const k = dayTypesKey(types);
  if (k === 'weekday') return 'Weekday';
  if (k === 'weekend') return 'Weekend';
  if (k === 'holiday') return 'Holiday';
  return types.join(', ');
}

function legacyRowToPricingRow(
  r: string[],
  lt: LegacyTable,
  fallbackWalkIn: number,
): PricingRow {
  const walkIdx = lt.columns.findIndex((c) => /walk|guest|price|đ|vnd/i.test(c));
  const memIdx = lt.columns.findIndex((c) => /member|regular/i.test(c));
  const timeIdx = lt.columns.findIndex((c) => /time|giờ|khung/i.test(c));

  const walkCell = walkIdx >= 0 ? r[walkIdx] ?? '' : r[r.length - 1] ?? '';
  const memCell = memIdx >= 0 ? r[memIdx] ?? '' : '';
  const timeCell = timeIdx >= 0 ? r[timeIdx] ?? '' : '';
  const w = parseVndFromCell(walkCell) ?? fallbackWalkIn;
  const mem = parseVndFromCell(memCell);
  const band = parseTimeBand(timeCell) ?? { start: '05:00', end: '23:30' };
  return {
    startTime: band.start,
    endTime: band.end,
    walkIn: w,
    member: memIdx >= 0 ? mem : null,
  };
}

export function legacyTablesToStructured(
  legacy: LegacyTable[],
  fallbackWalkIn: number,
): { tables: { name: string; dayTypes: string[]; rows: PricingRow[] }[]; hasMember: boolean } {
  if (legacy.length === 0) {
    return {
      tables: [
        {
          name: 'Standard',
          dayTypes: ['weekday', 'weekend'],
          rows: [{ startTime: '05:00', endTime: '23:30', walkIn: fallbackWalkIn, member: null }],
        },
      ],
      hasMember: false,
    };
  }

  let hasMember = false;
  const tables: { name: string; dayTypes: string[]; rows: PricingRow[] }[] = [];

  for (const lt of legacy) {
    const memIdx = lt.columns.findIndex((c) => /member|regular/i.test(c));
    if (memIdx >= 0) hasMember = true;

    const dayIdx = lt.columns.findIndex((c) => /^days?$/i.test(c.trim()));

    if (dayIdx < 0) {
      const rows: PricingRow[] = [];
      for (const row of lt.rows) {
        rows.push(legacyRowToPricingRow(row, lt, fallbackWalkIn));
      }
      if (rows.length === 0) {
        rows.push({
          startTime: '05:00',
          endTime: '23:30',
          walkIn: fallbackWalkIn,
          member: null,
        });
      }
      tables.push({
        name: lt.name.slice(0, 120),
        dayTypes: inferDayTypesFromTableName(lt.name),
        rows,
      });
      continue;
    }

    type Segment = { dayTypes: string[]; rows: PricingRow[] };
    const segments: Segment[] = [];
    let currentTypes: string[] | null = null;

    for (const row of lt.rows) {
      const parsed = parseDayCellToTypes(row[dayIdx] ?? '');
      if (parsed) currentTypes = parsed;
      if (!currentTypes) currentTypes = inferDayTypesFromTableName(lt.name);

      const types = [...currentTypes];
      const pr = legacyRowToPricingRow(row, lt, fallbackWalkIn);

      const last = segments[segments.length - 1];
      if (!last || dayTypesKey(last.dayTypes) !== dayTypesKey(types)) {
        segments.push({ dayTypes: types, rows: [pr] });
      } else {
        last.rows.push(pr);
      }
    }

    const nonEmpty = segments.filter((s) => s.rows.length > 0);
    if (nonEmpty.length === 0) {
      tables.push({
        name: lt.name.slice(0, 120),
        dayTypes: inferDayTypesFromTableName(lt.name),
        rows: [{ startTime: '05:00', endTime: '23:30', walkIn: fallbackWalkIn, member: null }],
      });
      continue;
    }

    for (const seg of nonEmpty) {
      const suffix = nonEmpty.length > 1 ? ` · ${dayTypesShortLabel(seg.dayTypes)}` : '';
      const base = lt.name.slice(0, Math.max(0, 120 - suffix.length));
      tables.push({
        name: (base + suffix).slice(0, 120),
        dayTypes: seg.dayTypes,
        rows: seg.rows,
      });
    }
  }

  return { tables, hasMember };
}

const DEFAULT_PRICE_MIN = 80_000;
const DEFAULT_PRICE_MAX = 120_000;

export function extractPriceRangeVnd(v: CourtJsonRow): [number, number] {
  const blob = JSON.stringify([v.pricing_tables, v.flat_prices]);
  const re = /\d{1,3}(?:\.\d{3})+/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    const n = parseInt(m[0].replace(/\./g, ''), 10);
    if (n >= 15_000 && n <= 5_000_000) values.push(n);
  }
  if (values.length === 0) return [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX];
  return [Math.min(...values), Math.max(...values)];
}
