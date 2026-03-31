import { PERIOD_WINDOWS, type PeriodKey } from './plannerConstants';

export function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatSlotMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${h}:${String(mm).padStart(2, '0')}`;
}

export function computeSlots(
  periodStart: number,
  periodEnd: number,
  durationMin: number,
  stepMin = 30
): number[] {
  const slots: number[] = [];
  const lastStart = periodEnd - durationMin;
  if (lastStart < periodStart) return slots;
  for (let t = periodStart; t <= lastStart; t += stepMin) {
    if (t + durationMin <= periodEnd) slots.push(t);
  }
  return slots;
}

export function getSlotsForPeriod(
  period: PeriodKey,
  durationMin: number
): number[] {
  const [a, b] = PERIOD_WINDOWS[period] || PERIOD_WINDOWS.morning;
  return computeSlots(a, b, durationMin, 30);
}

export function syncSlotToValid(
  period: PeriodKey,
  durationMin: number,
  slotStartMin: number | null
): number | null {
  const slots = getSlotsForPeriod(period, durationMin);
  if (!slots.length) {
    return PERIOD_WINDOWS[period][0];
  }
  if (slotStartMin == null || !slots.includes(slotStartMin)) {
    return slots[0];
  }
  return slotStartMin;
}
