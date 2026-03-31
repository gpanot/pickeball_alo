export const LOC_DEFAULT_KM = 5;

export const PERIOD_WINDOWS: Record<string, [number, number]> = {
  morning: [5 * 60, 12 * 60],
  noon: [11 * 60, 14 * 60],
  afternoon: [12 * 60, 19 * 60],
  night: [18 * 60, 24 * 60],
};

export const DURATION_OPTIONS = [
  { min: 60, label: '1h' },
  { min: 90, label: '1h30' },
  { min: 120, label: '2h' },
  { min: 150, label: '2h30' },
  { min: 180, label: '3h' },
] as const;

export const PERIOD_LABELS: Record<string, string> = {
  morning: 'Morning',
  noon: 'Noon',
  afternoon: 'Afternoon',
  night: 'Night',
};

export type PeriodKey = keyof typeof PERIOD_WINDOWS;
