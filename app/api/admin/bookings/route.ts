import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  const q = req.nextUrl.searchParams.get('q')?.trim();

  const where: {
    venueId: string;
    status?: string;
    date?: string;
    OR?: ({ userName: { contains: string; mode: 'insensitive' } } | { userPhone: { contains: string } })[];
  } = { venueId: venueId! };

  if (status && status !== 'all') where.status = status;
  if (date && date !== 'all') where.date = date;
  if (q) {
    where.OR = [
      { userName: { contains: q, mode: 'insensitive' } },
      { userPhone: { contains: q } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(bookings);
}
