import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

const FLAG_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;

  const { id: sessionId } = await params;

  const out = await prisma.$transaction(
    async (tx) => {
      const session = await tx.coachSession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!session) {
        return { kind: 'err' as const, status: 404 as const, message: 'Session not found' };
      }
      if (session.coachId !== auth.sub) {
        return { kind: 'err' as const, status: 403 as const, message: 'Forbidden' };
      }
      if (session.paymentStatus !== 'payment_submitted') {
        return {
          kind: 'err' as const,
          status: 400 as const,
          message: 'Session payment is not payment_submitted',
        };
      }
      if (session.paymentFlaggedAt != null) {
        return {
          kind: 'err' as const,
          status: 400 as const,
          message: 'Payment already flagged for this session',
        };
      }

      const paidAts = session.participants
        .map((p) => p.paidAt)
        .filter((d): d is Date => d != null);
      if (paidAts.length === 0) {
        return {
          kind: 'err' as const,
          status: 400 as const,
          message: 'No participant paidAt timestamp',
        };
      }
      const latestPaid = new Date(Math.max(...paidAts.map((d) => d.getTime())));
      if (Date.now() - latestPaid.getTime() > FLAG_WINDOW_MS) {
        return {
          kind: 'err' as const,
          status: 400 as const,
          message: 'Flag window (2h after payment) has passed',
        };
      }

      const coach = await tx.coach.findUnique({
        where: { id: auth.sub },
        select: { paymentFlagCount: true },
      });
      if (!coach || coach.paymentFlagCount >= 3) {
        return {
          kind: 'err' as const,
          status: 400 as const,
          message: 'Payment flag limit reached',
        };
      }

      const now = new Date();
      await tx.coachSession.update({
        where: { id: sessionId },
        data: {
          paymentFlaggedAt: now,
          paymentStatus: 'pending',
        },
      });
      await tx.coach.update({
        where: { id: auth.sub },
        data: { paymentFlagCount: { increment: 1 } },
      });

      const updated = await tx.coachSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { participants: true },
      });
      return { kind: 'ok' as const, session: updated };
    },
  );

  if (out.kind === 'err') {
    return NextResponse.json({ error: out.message }, { status: out.status });
  }

  return NextResponse.json(out.session);
}
