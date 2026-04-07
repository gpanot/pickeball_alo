import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const participantInclude = { participants: true } as const;

export async function PATCH(
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
  const { userId, paymentProofUrl } = body;

  if (typeof userId !== 'string' || typeof paymentProofUrl !== 'string' || !paymentProofUrl) {
    return NextResponse.json({ error: 'userId and paymentProofUrl required' }, { status: 400 });
  }

  const now = new Date();

  const session = await prisma.coachSession.findUnique({
    where: { id: sessionId },
    include: { participants: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const participant = session.participants.find((p) => p.userId === userId);
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found for this session' }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        paymentProofUrl,
        paymentStatus: 'payment_submitted',
        paidAt: now,
      },
    });
    return tx.coachSession.update({
      where: { id: sessionId },
      data: { paymentStatus: 'payment_submitted' },
      include: participantInclude,
    });
  });

  return NextResponse.json(updated);
}
