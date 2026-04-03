import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { freeSlotsForBooking } from '@/lib/slot-sync';

function resolveReviewedBy(body: { reviewedBy?: unknown }, nextStatus: string): string {
  if (typeof body.reviewedBy === 'string' && body.reviewedBy.trim()) {
    return body.reviewedBy.trim();
  }
  if (nextStatus === 'canceled') return 'player';
  return 'admin';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(booking);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body as {
    status?: string;
    adminNote?: string;
    reviewedBy?: string;
  };

  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'status required' }, { status: 400 });
  }

  const allowed: Record<string, string[]> = {
    pending: ['canceled', 'booked'],
    booked: ['canceled', 'paid'],
  };

  type TxResult =
    | { kind: 'ok'; booking: Awaited<ReturnType<typeof prisma.booking.update>> }
    | { kind: 'err'; message: string; httpStatus: number };

  const updated: TxResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({ where: { id } });
    if (!existing) {
      return { kind: 'err', message: 'Not found', httpStatus: 404 };
    }

    if (!allowed[existing.status]?.includes(status)) {
      return {
        kind: 'err',
        message: `Cannot transition from ${existing.status} to ${status}`,
        httpStatus: 400,
      };
    }

    const now = new Date();
    const reviewedBy = resolveReviewedBy(body, status);

    const data: {
      status: string;
      reviewedAt?: Date;
      reviewedBy?: string | null;
      adminNote?: string | null;
    } = { status };

    if (existing.status === 'pending' && status === 'booked') {
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
    } else if (existing.status === 'pending' && status === 'canceled') {
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
      if (typeof body.adminNote === 'string') {
        data.adminNote = body.adminNote.trim() || null;
      }
      await freeSlotsForBooking(tx, existing.venueId, existing.date, existing.slots);
    } else if (existing.status === 'booked' && status === 'paid') {
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
    } else if (existing.status === 'booked' && status === 'canceled') {
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
      if (typeof body.adminNote === 'string') {
        data.adminNote = body.adminNote.trim() || null;
      }
      await freeSlotsForBooking(tx, existing.venueId, existing.date, existing.slots);
    }

    const row = await tx.booking.update({
      where: { id },
      data,
    });
    return { kind: 'ok', booking: row };
  });

  if (updated.kind === 'err') {
    return NextResponse.json({ error: updated.message }, { status: updated.httpStatus });
  }

  return NextResponse.json(updated.booking);
}
