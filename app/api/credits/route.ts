import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const credits = await prisma.credit.findMany({
    where: { userId },
    include: { coach: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(credits);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { coachId, userId, userName, userPhone, creditPackId } = body;

  if (
    typeof coachId !== 'string' ||
    typeof userId !== 'string' ||
    typeof userName !== 'string' ||
    typeof userPhone !== 'string' ||
    typeof creditPackId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pack = await prisma.creditPack.findFirst({
    where: { id: creditPackId, coachId, isActive: true },
  });
  if (!pack || pack.creditCount <= 0) {
    return NextResponse.json({ error: 'Credit pack not found' }, { status: 404 });
  }

  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  const pricePerCredit = Math.round(pack.price / pack.creditCount);
  const expiresAt = new Date(
    Date.now() + coach.creditExpiryDays * 24 * 60 * 60 * 1000,
  );

  const credit = await prisma.credit.create({
    data: {
      coachId,
      userId,
      userName,
      userPhone,
      creditPackId: pack.id,
      totalCredits: pack.creditCount,
      remainingCredits: pack.creditCount,
      pricePerCredit,
      totalPaid: pack.price,
      paymentStatus: 'pending',
      expiresAt,
    },
    include: { coach: { select: { name: true } } },
  });

  return NextResponse.json(credit, { status: 201 });
}
