import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';
import { autoCancelExpiredBookings } from '@/lib/booking-deadline';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  const q = req.nextUrl.searchParams.get('q')?.trim();

  const where: Prisma.BookingWhereInput = { venueId: venueId! };

  if (status && status !== 'all') where.status = status;
  if (date && date !== 'all') where.date = date;
  if (q) {
    const ref = q.replace(/^cm-?/i, '').replace(/[^a-z0-9]/gi, '');
    const or: Prisma.BookingWhereInput[] = [
      { userName: { contains: q, mode: 'insensitive' } },
      { userPhone: { contains: q } },
      { orderId: { contains: q, mode: 'insensitive' } },
    ];
    if (ref.length >= 2) {
      or.push({ orderId: { contains: ref, mode: 'insensitive' } });
    }
    where.OR = or;
  }

  await autoCancelExpiredBookings(prisma, { venueId: venueId! });

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(bookings);
}
