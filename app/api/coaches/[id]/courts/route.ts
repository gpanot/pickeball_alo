import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { id } });
  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  const links = await prisma.coachCourtLink.findMany({
    where: { coachId: id, isActive: true },
    include: {
      venue: { select: { name: true, address: true } },
    },
    orderBy: { id: 'asc' },
  });

  return NextResponse.json(links);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = requireCoach(req);
  if (coach instanceof NextResponse) return coach;
  if (coach.sub !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { venueId?: string; courtIds?: string[] };
  try {
    body = (await req.json()) as { venueId?: string; courtIds?: string[] };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const venueId = body?.venueId;
  if (!venueId || typeof venueId !== 'string') {
    return NextResponse.json({ error: 'venueId is required' }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  const courtIds = Array.isArray(body.courtIds)
    ? body.courtIds.filter((c): c is string => typeof c === 'string')
    : [];

  const existing = await prisma.coachCourtLink.findUnique({
    where: { coachId_venueId: { coachId: id, venueId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Court partnership already exists' },
      { status: 409 },
    );
  }

  const link = await prisma.coachCourtLink.create({
    data: {
      coachId: id,
      venueId,
      courtIds,
      isActive: true,
    },
    include: {
      venue: { select: { name: true, address: true } },
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = requireCoach(req);
  if (coach instanceof NextResponse) return coach;
  if (coach.sub !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const venueId = req.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json(
      { error: 'venueId query parameter is required' },
      { status: 400 },
    );
  }

  const result = await prisma.coachCourtLink.updateMany({
    where: { coachId: id, venueId },
    data: { isActive: false },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
