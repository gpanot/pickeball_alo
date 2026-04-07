import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

function monthBounds(month: string): { start: string; endExclusive: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const start = `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-01`;
  const next = mo === 12 ? { y: y + 1, mo: 1 } : { y, mo: mo + 1 };
  const endExclusive = `${next.y.toString().padStart(4, '0')}-${next.mo.toString().padStart(2, '0')}-01`;
  return { start, endExclusive };
}

function defaultMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: venueId } = await params;
  const qVenueId = req.nextUrl.searchParams.get('venueId') || venueId;
  const authError = requireAdminVenue(req, qVenueId);
  if (authError) return authError;

  const monthParam = req.nextUrl.searchParams.get('month')?.trim();
  const month = monthParam || defaultMonthKey(new Date());
  const bounds = monthBounds(month);
  if (!bounds) {
    return NextResponse.json(
      { error: 'Invalid month; use YYYY-MM' },
      { status: 400 },
    );
  }

  const { start, endExclusive } = bounds;

  const [
    directAgg,
    directCount,
    coachAgg,
    coachCount,
  ] = await Promise.all([
    prisma.booking.aggregate({
      where: {
        venueId: qVenueId,
        status: 'paid',
        date: { gte: start, lt: endExclusive },
      },
      _sum: { totalPrice: true },
    }),
    prisma.booking.count({
      where: {
        venueId: qVenueId,
        status: 'paid',
        date: { gte: start, lt: endExclusive },
      },
    }),
    prisma.coachSession.aggregate({
      where: {
        venueId: qVenueId,
        date: { gte: start, lt: endExclusive },
        paymentStatus: { in: ['confirmed', 'completed'] },
      },
      _sum: { courtFee: true },
    }),
    prisma.coachSession.count({
      where: {
        venueId: qVenueId,
        date: { gte: start, lt: endExclusive },
        paymentStatus: { in: ['confirmed', 'completed'] },
      },
    }),
  ]);

  const directRevenue = directAgg._sum.totalPrice ?? 0;
  const coachRevenue = coachAgg._sum.courtFee ?? 0;

  return NextResponse.json({
    month,
    directRevenue,
    coachRevenue,
    totalRevenue: directRevenue + coachRevenue,
    directBookingCount: directCount,
    coachSessionCount: coachCount,
    courtUtilization: {},
  });
}
