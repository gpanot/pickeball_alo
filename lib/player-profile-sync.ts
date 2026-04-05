import { prisma } from '@/lib/prisma';

/** Keep UserProfile in sync when a player submits or updates a booking (non-blocking for booking success). */
export async function upsertPlayerProfileFromBooking(name: string, phone: string): Promise<void> {
  const n = typeof name === 'string' ? name.trim() : '';
  const p = typeof phone === 'string' ? phone.trim() : '';
  if (!n || !p) return;
  try {
    await prisma.userProfile.upsert({
      where: { phone: p },
      update: { name: n },
      create: { name: n, phone: p, savedVenues: [] },
    });
  } catch (e) {
    console.error('upsertPlayerProfileFromBooking', e);
  }
}
