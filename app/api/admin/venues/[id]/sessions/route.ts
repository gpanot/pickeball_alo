import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: venueId } = await params;
  const qVenueId = req.nextUrl.searchParams.get('venueId') || venueId;
  const authError = requireAdminVenue(req, qVenueId);
  if (authError) return authError;

  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const limitRaw = req.nextUrl.searchParams.get('limit');
  const offsetRaw = req.nextUrl.searchParams.get('offset');

  const limit = Math.min(Math.max(Number(limitRaw ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(offsetRaw ?? 0) || 0, 0);

  const where: Prisma.CoachSessionWhereInput = { venueId: qVenueId };
  if (date) where.date = date;
  if (status) where.paymentStatus = status;

  const [sessions, total] = await Promise.all([
    prisma.coachSession.findMany({
      where,
      include: {
        coach: { select: { id: true, name: true, phone: true, photo: true } },
        participants: true,
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.coachSession.count({ where }),
  ]);

  return NextResponse.json({ sessions, total, limit, offset });
}
