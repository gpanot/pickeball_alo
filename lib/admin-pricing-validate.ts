import type { PricingRow } from '@/lib/pricing';

/** Parse and validate pricing rows from admin API JSON body. */
export function parsePricingRowsBody(rows: unknown): PricingRow[] | null {
  if (!Array.isArray(rows)) return null;
  const out: PricingRow[] = [];
  for (const x of rows) {
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    const startTime = typeof o.startTime === 'string' ? o.startTime.trim() : '';
    const endTime = typeof o.endTime === 'string' ? o.endTime.trim() : '';
    const walkIn = Number(o.walkIn);
    if (!startTime || !endTime || !Number.isFinite(walkIn) || walkIn < 0) return null;
    let member: number | null = null;
    if (o.member != null && o.member !== '') {
      const mv = Number(o.member);
      if (!Number.isFinite(mv) || mv < 0) return null;
      member = Math.round(mv);
    }
    out.push({
      startTime,
      endTime,
      walkIn: Math.round(walkIn),
      member,
    });
  }
  return out.length > 0 ? out : null;
}
