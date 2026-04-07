import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const participantInclude = { participants: true } as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { userId, userName, userPhone } = body;

  if (
    typeof userId !== 'string' ||
    typeof userName !== 'string' ||
    typeof userPhone !== 'string'
  ) {
    return NextResponse.json({ error: 'userId, userName, userPhone required' }, { status: 400 });
  }

  const session = await prisma.coachSession.findUnique({
    where: { id: sessionId },
    include: { participants: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.sessionType !== 'group') {
    return NextResponse.json({ error: 'Session is not a group session' }, { status: 400 });
  }

  if (session.status === 'canceled' || session.status === 'completed') {
    return NextResponse.json({ error: 'Session is not open for joins' }, { status: 400 });
  }

  if (session.participants.length >= session.maxPlayers) {
    return NextResponse.json({ error: 'Session is full' }, { status: 400 });
  }

  if (session.participants.some((p) => p.userId === userId)) {
    return NextResponse.json({ error: 'Player already joined' }, { status: 400 });
  }

  const updated = await prisma.coachSession.update({
    where: { id: sessionId },
    data: {
      participants: {
        create: {
          userId,
          userName,
          userPhone,
          amountDue: session.totalPerPlayer,
          paymentStatus: 'pending',
        },
      },
    },
    include: participantInclude,
  });

  return NextResponse.json(updated, { status: 201 });
}
