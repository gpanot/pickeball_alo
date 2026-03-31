import type { CourtRaw } from './types';

export function getMinPrice(venue: CourtRaw): number | null {
  let min = Infinity;
  const priceRe = /(\d[\d.,]+)\s*(?:đ|VND|vnđ|₫)/gi;
  const text = JSON.stringify(venue);
  let match: RegExpExecArray | null;
  while ((match = priceRe.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/[.,]/g, ''));
    if (val > 10000 && val < 10000000) min = Math.min(min, val);
  }
  return min === Infinity ? null : min;
}

export function formatPrice(p: number | null | undefined): string {
  if (!p) return '';
  return (p / 1000).toFixed(0) + 'k';
}

export function priceColor(p: number | null | undefined): string {
  if (!p) return '#666';
  if (p <= 80000) return '#C8F135';
  if (p <= 120000) return '#FFD700';
  return '#FF5B1F';
}
