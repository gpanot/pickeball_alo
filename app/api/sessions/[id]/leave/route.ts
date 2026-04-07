import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const participantInclude = { participants: true } as const;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
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
    return NextResponse.json({ error: 'Session is not open for changes' }, { status: 400 });
  }

  const participant = session.participants.find((p) => p.userId === userId);
  if (!participant) {
    return NextResponse.json({ error: 'Player not in this session' }, { status: 404 });
  }

  if (participant.paymentStatus === 'paid' || participant.paymentStatus === 'confirmed') {
    return NextResponse.json(
      { error: 'Cannot leave after payment is confirmed — contact the coach' },
      { status: 400 },
    );
  }

  await prisma.sessionParticipant.delete({ where: { id: participant.id } });

  // If last participant left, cancel the session
  const remaining = session.participants.length - 1;
  if (remaining === 0) {
    const canceled = await prisma.coachSession.update({
      where: { id: sessionId },
      data: { status: 'canceled' },
      include: participantInclude,
    });
    return NextResponse.json(canceled);
  }

  const updated = await prisma.coachSession.findUnique({
    where: { id: sessionId },
    include: participantInclude,
  });
  return NextResponse.json(updated);
}
