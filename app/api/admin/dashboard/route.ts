import { NextRequest, NextResponse } from 'next/server';
import { toLocalDateKey } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';
import { autoCancelExpiredBookings } from '@/lib/booking-deadline';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  /** Matches player booking date chips (local calendar). */
  const today = toLocalDateKey(new Date());

  await autoCancelExpiredBookings(prisma, { venueId: venueId! });

  const [pendingCount, paymentSubmittedCount, confirmedToday, revenueAgg, courts] = await Promise.all([
    prisma.booking.count({ where: { venueId: venueId!, status: 'pending' } }),
    prisma.booking.count({ where: { venueId: venueId!, status: 'payment_submitted' } }),
    prisma.booking.count({
      where: {
        venueId: venueId!,
        date: today,
        status: 'paid',
      },
    }),
    prisma.booking.aggregate({
      where: {
        venueId: venueId!,
        date: today,
        status: 'paid',
      },
      _sum: { totalPrice: true },
    }),
    prisma.court.findMany({
      where: { venueId: venueId! },
      select: { isAvailable: true },
    }),
  ]);

  const totalCourts = courts.length;
  const activeCourts = courts.filter((c) => c.isAvailable).length;

  return NextResponse.json({
    today,
    pendingCount,
    paymentSubmittedCount,
    confirmedToday,
    revenueToday: revenueAgg._sum.totalPrice ?? 0,
    courtsActive: activeCourts,
    courtsTotal: totalCourts,
  });
}
