import type { Prisma } from '@/lib/generated/prisma/client';

/**
 * Split query into tokens; each token must match name or address (AND).
 * So "65 pickleball" matches "65th Street PICKLEBALL" (player search + admin picker).
 */
export function venueSearchTokensWhere(q: string): Prisma.VenueWhereInput | undefined {
  const tokens = q
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return undefined;
  return {
    AND: tokens.map((token) => ({
      OR: [
        { name: { contains: token, mode: 'insensitive' } },
        { address: { contains: token, mode: 'insensitive' } },
      ],
    })),
  };
}

/**
 * Admin login picker: pure digit queries (e.g. "65") search **name only**, so
 * "Đường số 65" in another club’s address does not hide "65th Street PICKLEBALL".
 * Text queries still match name or address (tokenized AND).
 */
export function adminVenuePickerWhere(q: string): Prisma.VenueWhereInput | undefined {
  const trimmed = q.trim();
  if (!trimmed) return undefined;
  if (/^\d{1,6}$/.test(trimmed)) {
    return { name: { contains: trimmed, mode: 'insensitive' } };
  }
  return venueSearchTokensWhere(trimmed);
}
