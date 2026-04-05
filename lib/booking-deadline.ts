import type { PrismaClient } from '@/lib/generated/prisma/client';
import { freeSlotsForBooking } from '@/lib/slot-sync';

/**
 * Auto-cancel any pending bookings whose paymentDeadline has passed
 * without a proof of payment uploaded.
 * Designed to be called before returning bookings so the user sees
 * accurate status without relying on a background cron.
 */
export async function autoCancelExpiredBookings(
  db: PrismaClient,
  filter?: { userId?: string; venueId?: string; bookingId?: string },
): Promise<number> {
  const now = new Date();
  const where: Record<string, unknown> = {
    status: 'pending',
    paymentDeadline: { lt: now },
    paymentProofUrl: null,
  };
  if (filter?.userId) where.userId = filter.userId;
  if (filter?.venueId) where.venueId = filter.venueId;
  if (filter?.bookingId) where.id = filter.bookingId;

  const expired = await db.booking.findMany({ where });
  if (expired.length === 0) return 0;

  for (const b of expired) {
    await db.$transaction(async (tx) => {
      await freeSlotsForBooking(tx, b.venueId, b.date, b.slots);
      await tx.booking.update({
        where: { id: b.id },
        data: {
          status: 'canceled',
          reviewedAt: now,
          reviewedBy: 'system',
          adminNote: 'Auto-cancelled: payment deadline expired',
        },
      });
    });
  }
  return expired.length;
}
