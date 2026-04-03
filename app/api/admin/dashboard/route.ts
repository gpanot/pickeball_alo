import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const today = todayStr();

  const [pendingCount, confirmedToday, revenueAgg, courts] = await Promise.all([
    prisma.booking.count({ where: { venueId: venueId!, status: 'pending' } }),
    prisma.booking.count({
      where: {
        venueId: venueId!,
        date: today,
        status: { in: ['booked', 'paid'] },
      },
    }),
    prisma.booking.aggregate({
      where: {
        venueId: venueId!,
        date: today,
        status: { in: ['booked', 'paid'] },
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
    confirmedToday,
    revenueToday: revenueAgg._sum.totalPrice ?? 0,
    courtsActive: activeCourts,
    courtsTotal: totalCourts,
  });
}
