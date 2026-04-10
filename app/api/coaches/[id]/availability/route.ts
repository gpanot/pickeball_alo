import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

type AvailabilityItem = {
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
  venueId?: string | null;
  isBlocked?: boolean;
};

type PutBody = { availability: AvailabilityItem[] };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { id } });
  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  const dateParam = req.nextUrl.searchParams.get('date');
  const where = dateParam
    ? { coachId: id, date: dateParam }
    : { coachId: id };

  const rows = await prisma.coachAvailability.findMany({
    where,
    orderBy: [{ dayOfWeek: 'asc' }, { date: 'asc' }, { startTime: 'asc' }],
  });

  return NextResponse.json(rows);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = requireCoach(req);
  if (coach instanceof NextResponse) return coach;
  if (coach.sub !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.availability || !Array.isArray(body.availability)) {
    return NextResponse.json(
      { error: 'Body must include availability: array' },
      { status: 400 },
    );
  }

  const venueIds = [...new Set(body.availability.map((a) => a.venueId).filter(Boolean))] as string[];
  if (venueIds.length > 0) {
    const foundVenues = await prisma.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true },
    });
    if (foundVenues.length !== venueIds.length) {
      return NextResponse.json({ error: 'One or more venues not found' }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachAvailability.deleteMany({ where: { coachId: id } });
    if (body.availability.length > 0) {
      await tx.coachAvailability.createMany({
        data: body.availability.map((a) => ({
          coachId: id,
          dayOfWeek: a.dayOfWeek ?? null,
          date: a.date ?? null,
          startTime: a.startTime,
          endTime: a.endTime,
          venueId: a.venueId ?? null,
          isBlocked: a.isBlocked ?? false,
        })),
      });
    }
  });

  const rows = await prisma.coachAvailability.findMany({
    where: { coachId: id },
    orderBy: [{ dayOfWeek: 'asc' }, { date: 'asc' }, { startTime: 'asc' }],
  });

  return NextResponse.json(rows);
}
