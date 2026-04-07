import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function isRating1to5(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { id } });
  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  const limitRaw = req.nextUrl.searchParams.get('limit');
  const offsetRaw = req.nextUrl.searchParams.get('offset');

  const limitParsed = limitRaw != null ? Number.parseInt(limitRaw, 10) : 10;
  const limit = Number.isFinite(limitParsed)
    ? Math.min(Math.max(limitParsed, 1), 100)
    : 10;

  const offsetParsed = offsetRaw != null ? Number.parseInt(offsetRaw, 10) : 0;
  const offset = Number.isFinite(offsetParsed) && offsetParsed >= 0 ? offsetParsed : 0;

  const [reviews, total] = await Promise.all([
    prisma.coachReview.findMany({
      where: { coachId: id, isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.coachReview.count({ where: { coachId: id, isPublic: true } }),
  ]);

  return NextResponse.json({ reviews, total, limit, offset });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const coach = await prisma.coach.findUnique({ where: { id } });
  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  let body: {
    sessionId?: string | null;
    userId?: unknown;
    userName?: unknown;
    ratingOnTime?: unknown;
    ratingFriendly?: unknown;
    ratingProfessional?: unknown;
    ratingRecommend?: unknown;
    comment?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body.userId;
  const userName = body.userName;
  if (userId == null || userId === '' || typeof userName !== 'string' || !userName.trim()) {
    return NextResponse.json(
      { error: 'userId and userName are required' },
      { status: 400 },
    );
  }

  const {
    ratingOnTime,
    ratingFriendly,
    ratingProfessional,
    ratingRecommend,
  } = body;

  if (
    !isRating1to5(ratingOnTime)
    || !isRating1to5(ratingFriendly)
    || !isRating1to5(ratingProfessional)
    || !isRating1to5(ratingRecommend)
  ) {
    return NextResponse.json(
      { error: 'All ratings must be integers from 1 to 5' },
      { status: 400 },
    );
  }

  const ratingOverall =
    (ratingOnTime + ratingFriendly + ratingProfessional + ratingRecommend) / 4;

  const sessionId =
    body.sessionId == null || body.sessionId === ''
      ? null
      : String(body.sessionId);

  // Session must be completed to submit a review
  if (sessionId) {
    const session = await prisma.coachSession.findUnique({
      where: { id: sessionId },
      select: { status: true, coachId: true },
    });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed sessions' },
        { status: 400 },
      );
    }
    if (session.coachId !== id) {
      return NextResponse.json(
        { error: 'Session does not belong to this coach' },
        { status: 400 },
      );
    }
  }

  const comment =
    body.comment == null || typeof body.comment !== 'string'
      ? null
      : body.comment;

  // Determine isPublic: player must have >= 3 completed sessions with this coach AND coach must be phoneVerified
  const completedSessionCount = await prisma.coachSession.count({
    where: {
      coachId: id,
      status: 'completed',
      participants: { some: { userId: String(userId) } },
    },
  });

  const isPublic = completedSessionCount >= 3 && coach.phoneVerified;

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.coachReview.create({
      data: {
        coachId: id,
        sessionId,
        userId: String(userId),
        userName: userName.trim(),
        ratingOnTime,
        ratingFriendly,
        ratingProfessional,
        ratingRecommend,
        ratingOverall,
        comment,
        isPublic,
      },
    });

    // If this review makes the player reach 3+ sessions AND coach is verified,
    // flip all prior private reviews from this player for this coach to public
    if (isPublic) {
      await tx.coachReview.updateMany({
        where: {
          coachId: id,
          userId: String(userId),
          isPublic: false,
        },
        data: { isPublic: true },
      });
    }

    const agg = await tx.coachReview.aggregate({
      where: { coachId: id },
      _avg: {
        ratingOnTime: true,
        ratingFriendly: true,
        ratingProfessional: true,
        ratingRecommend: true,
        ratingOverall: true,
      },
      _count: { _all: true },
    });

    await tx.coach.update({
      where: { id },
      data: {
        ratingOnTime: agg._avg.ratingOnTime,
        ratingFriendly: agg._avg.ratingFriendly,
        ratingProfessional: agg._avg.ratingProfessional,
        ratingRecommend: agg._avg.ratingRecommend,
        ratingOverall: agg._avg.ratingOverall,
        reviewCount: agg._count._all,
      },
    });

    return created;
  });

  return NextResponse.json(review, { status: 201 });
}
