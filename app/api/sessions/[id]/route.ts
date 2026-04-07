import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const participantInclude = { participants: true } as const;

/** Session wall time is interpreted as Vietnam local (CourtMap market). */
function parseSessionStart(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00+07:00`);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await prisma.coachSession.findUnique({
    where: { id },
    include: participantInclude,
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const status = body?.status as string | undefined;

  if (status !== 'completed' && status !== 'canceled') {
    return NextResponse.json(
      { error: 'status must be completed or canceled' },
      { status: 400 },
    );
  }

  const existing = await prisma.coachSession.findUnique({
    where: { id },
    include: { participants: true, coach: { select: { cancellationHours: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (existing.status === 'canceled') {
    return NextResponse.json({ error: 'Session is already canceled' }, { status: 400 });
  }

  if (status === 'completed') {
    if (existing.status === 'completed') {
      const current = await prisma.coachSession.findUnique({
        where: { id },
        include: participantInclude,
      });
      return NextResponse.json(current);
    }
    const updated = await prisma.coachSession.update({
      where: { id },
      data: { status: 'completed' },
      include: participantInclude,
    });
    return NextResponse.json(updated);
  }

  if (existing.status === 'completed') {
    return NextResponse.json({ error: 'Cannot cancel a completed session' }, { status: 400 });
  }

  const sessionStart = parseSessionStart(existing.date, existing.startTime);
  const hoursUntil = (sessionStart.getTime() - Date.now()) / (3_600_000);
  if (hoursUntil < existing.coach.cancellationHours) {
    return NextResponse.json(
      { error: `Cancellation must be at least ${existing.coach.cancellationHours}h before session` },
      { status: 400 },
    );
  }

  // Refund credits only if cancellation is > 24h before session
  const hoursUntilRefundWindow = 24;
  const eligibleForRefund = hoursUntil >= hoursUntilRefundWindow;

  const updated = await prisma.$transaction(async (tx) => {
    if (eligibleForRefund) {
      for (const p of existing.participants) {
        if (p.paymentMethod === 'credit' && p.creditId) {
          await tx.credit.update({
            where: { id: p.creditId },
            data: { remainingCredits: { increment: 1 } },
          });
        }
      }
    }
    return tx.coachSession.update({
      where: { id },
      data: { status: 'canceled' },
      include: participantInclude,
    });
  });

  return NextResponse.json(updated);
}
