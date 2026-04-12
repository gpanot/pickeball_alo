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

  // Look up linked session for timing validation
  let sessionRow: {
    status: string;
    coachId: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null = null;

  if (sessionId) {
    sessionRow = await prisma.coachSession.findUnique({
      where: { id: sessionId },
      select: { status: true, coachId: true, date: true, startTime: true, endTime: true },
    });
    if (!sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (sessionRow.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed sessions' },
        { status: 400 },
      );
    }
    if (sessionRow.coachId !== id) {
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

  // Timing fraud detection: review must be submitted after 100% of session elapsed
  const now = new Date();
  let isFlagged = false;
  let flagReason: string | null = null;

  if (sessionRow) {
    const [eh, em] = sessionRow.endTime.split(':').map(Number);
    const sessionEndMs = new Date(`${sessionRow.date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00+07:00`).getTime();
    if (now.getTime() < sessionEndMs) {
      const [sh, sm] = sessionRow.startTime.split(':').map(Number);
      const sessionStartMs = new Date(`${sessionRow.date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00+07:00`).getTime();
      const durationMs = sessionEndMs - sessionStartMs;
      const elapsedMs = now.getTime() - sessionStartMs;
      const pct = durationMs > 0 ? Math.round((elapsedMs / durationMs) * 100) : 0;
      isFlagged = true;
      flagReason = `Review submitted at ${pct}% of session (before session end). Session ${sessionRow.startTime}-${sessionRow.endTime} on ${sessionRow.date}.`;
    }
  }

  // Determine isPublic: player must have >= 3 completed sessions with this coach AND coach must be phoneVerified
  const completedSessionCount = await prisma.coachSession.count({
    where: {
      coachId: id,
      status: 'completed',
      participants: { some: { userId: String(userId) } },
    },
  });

  const isPublic = !isFlagged && completedSessionCount >= 3 && coach.phoneVerified;

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
        ratedAt: now,
        isFlagged,
        flagReason,
      },
    });

    // If flagged: immediately delist the coach and lock the profile
    if (isFlagged) {
      await tx.coach.update({
        where: { id },
        data: {
          isProfilePublic: false,
          isProfileLocked: true,
        },
      });
    }

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

    // Recompute aggregate ratings (exclude flagged reviews)
    const agg = await tx.coachReview.aggregate({
      where: { coachId: id, isFlagged: false },
      _avg: {
        ratingOnTime: true,
        ratingFriendly: true,
        ratingProfessional: true,
        ratingRecommend: true,
        ratingOverall: true,
      },
    });

    // Count distinct reviewers (unique players) excluding flagged reviews
    const uniqueReviewers = await tx.coachReview.findMany({
      where: { coachId: id, isFlagged: false },
      distinct: ['userId'],
      select: { userId: true },
    });

    await tx.coach.update({
      where: { id },
      data: {
        ratingOnTime: agg._avg.ratingOnTime,
        ratingFriendly: agg._avg.ratingFriendly,
        ratingProfessional: agg._avg.ratingProfessional,
        ratingRecommend: agg._avg.ratingRecommend,
        ratingOverall: agg._avg.ratingOverall,
        reviewCount: uniqueReviewers.length,
      },
    });

    return created;
  });

  return NextResponse.json(review, { status: 201 });
}
