import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { computeCourtFeeVnd, sessionDurationHours } from '@/lib/session-court-fee';
import type { PricingTableLite } from '@/lib/pricing';

const participantInclude = { participants: true } as const;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const userId = sp.get('userId');
  const coachId = sp.get('coachId');
  const status = sp.get('status') ?? undefined;
  const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(sp.get('offset') ?? '0', 10) || 0, 0);

  if (!!userId === !!coachId) {
    return NextResponse.json({ error: 'Provide exactly one of userId or coachId' }, { status: 400 });
  }

  const where = {
    ...(coachId ? { coachId } : {}),
    ...(userId ? { participants: { some: { userId } } } : {}),
    ...(status ? { status } : {}),
  };

  const sessions = await prisma.coachSession.findMany({
    where,
    include: participantInclude,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    take: limit,
    skip: offset,
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const {
    coachId,
    venueId,
    date,
    startTime,
    endTime,
    sessionType,
    userId,
    userName,
    userPhone,
    paymentMethod,
  } = body as Record<string, unknown>;

  if (
    typeof coachId !== 'string' ||
    typeof venueId !== 'string' ||
    typeof date !== 'string' ||
    typeof startTime !== 'string' ||
    typeof endTime !== 'string' ||
    typeof userId !== 'string' ||
    typeof userName !== 'string' ||
    typeof userPhone !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (sessionType !== '1on1' && sessionType !== 'group') {
    return NextResponse.json({ error: 'sessionType must be 1on1 or group' }, { status: 400 });
  }

  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach || !coach.isActive) {
    return NextResponse.json({ error: 'Coach not found or inactive' }, { status: 404 });
  }

  if (!coach.phoneVerified) {
    return NextResponse.json({ error: 'Coach phone not verified' }, { status: 403 });
  }

  // Trial: reject if 10 bookings already used
  if (coach.subscriptionPlan === 'trial' && coach.trialBookingsUsed >= 10) {
    return NextResponse.json(
      { error: 'Trial limit reached (10 bookings). Please upgrade subscription.' },
      { status: 403 },
    );
  }

  // Standard/Pro: reject if subscription expired
  if (
    coach.subscriptionPlan !== 'trial' &&
    coach.subscriptionExpires &&
    coach.subscriptionExpires < new Date()
  ) {
    return NextResponse.json({ error: 'Coach subscription expired' }, { status: 403 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      pricingTables: { orderBy: { sortOrder: 'asc' } },
      dateOverrides: true,
    },
  });
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  const link = await prisma.coachCourtLink.findUnique({
    where: { coachId_venueId: { coachId, venueId } },
  });
  if (!link || !link.isActive || link.courtIds.length === 0) {
    return NextResponse.json(
      { error: 'Coach has no active court link for this venue' },
      { status: 400 },
    );
  }

  const firstCourtId = link.courtIds[0]!;
  const court = await prisma.court.findFirst({
    where: { id: firstCourtId, venueId },
  });
  if (!court) {
    return NextResponse.json({ error: 'Linked court not found at venue' }, { status: 400 });
  }

  // Validate coach availability covers the requested slot
  const dayOfWeek = new Date(`${date}T00:00:00+07:00`).getDay();
  const availability = await prisma.coachAvailability.findMany({
    where: {
      coachId,
      isBlocked: false,
      OR: [
        { date: date as string },
        { dayOfWeek, date: null },
      ],
    },
  });

  const slotCovered = availability.some(
    (a) => a.startTime <= (startTime as string) && a.endTime >= (endTime as string),
  );
  if (!slotCovered) {
    return NextResponse.json(
      { error: 'Coach is not available for the requested time slot' },
      { status: 400 },
    );
  }

  // 3-hour daily coaching limit per player
  const existingSessions = await prisma.coachSession.findMany({
    where: {
      date: date as string,
      status: { not: 'canceled' },
      participants: { some: { userId: userId as string } },
    },
    select: { startTime: true, endTime: true },
  });

  const existingMinutes = existingSessions.reduce((sum, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return sum + (eh! * 60 + em!) - (sh! * 60 + sm!);
  }, 0);

  const [rsh, rsm] = (startTime as string).split(':').map(Number);
  const [reh, rem] = (endTime as string).split(':').map(Number);
  const requestedMinutes = (reh! * 60 + rem!) - (rsh! * 60 + rsm!);

  if (existingMinutes + requestedMinutes > 180) {
    return NextResponse.json(
      { error: 'Player cannot book more than 3 hours of coaching per day' },
      { status: 400 },
    );
  }

  const pricingTables: PricingTableLite[] = venue.pricingTables.map((t) => ({
    dayTypes: t.dayTypes,
    sortOrder: t.sortOrder,
    rows: t.rows,
  }));

  const courtFee = await computeCourtFeeVnd({
    courtId: firstCourtId,
    date,
    startTime,
    endTime,
    use30MinSlots: venue.use30MinSlots,
    pricingTables,
    dateOverrides: venue.dateOverrides,
  });

  const hours = sessionDurationHours(startTime, endTime);
  const hourly =
    sessionType === 'group'
      ? (coach.hourlyRateGroup ?? coach.hourlyRate1on1)
      : coach.hourlyRate1on1;
  const coachFee = Math.round(hours * hourly);
  const totalPerPlayer = coachFee + courtFee;

  const maxPlayers = sessionType === 'group' ? coach.maxGroupSize : 1;

  // Credit payment validation
  let creditId: string | null = null;
  if (paymentMethod === 'credit') {
    const now = new Date();
    const credit = await prisma.credit.findFirst({
      where: {
        coachId,
        userId: userId as string,
        remainingCredits: { gt: 0 },
        paymentStatus: 'confirmed',
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
    });
    if (!credit) {
      return NextResponse.json(
        { error: 'No available credits for this coach' },
        { status: 400 },
      );
    }
    creditId = credit.id;
  }

  const session = await prisma.$transaction(async (tx) => {
    // Deduct credit if paying with credit
    if (creditId) {
      await tx.credit.update({
        where: { id: creditId },
        data: { remainingCredits: { decrement: 1 } },
      });
    }

    const created = await tx.coachSession.create({
      data: {
        coachId,
        venueId,
        venueName: venue.name,
        courtName: court.name,
        date,
        startTime,
        endTime,
        sessionType,
        maxPlayers,
        status: 'confirmed',
        coachFee,
        courtFee,
        totalPerPlayer,
        paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : null,
        paymentStatus: creditId ? 'paid' : 'pending',
        slotIds: [],
        participants: {
          create: {
            userId,
            userName,
            userPhone,
            amountDue: totalPerPlayer,
            paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : null,
            paymentStatus: creditId ? 'paid' : 'pending',
            creditId,
          },
        },
      },
      include: participantInclude,
    });

    if (coach.subscriptionPlan === 'trial') {
      await tx.coach.update({
        where: { id: coachId },
        data: { trialBookingsUsed: { increment: 1 } },
      });
    }

    return created;
  });

  return NextResponse.json(session, { status: 201 });
}
