import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { upsertPlayerProfileFromBooking } from '@/lib/player-profile-sync';
import { freeSlotsForBooking, markSlotsBooked, resolveSlotIdsForReserve } from '@/lib/slot-sync';

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

type PlayerUpdateBody = {
  userId: string;
  slots: unknown;
  totalPrice: number;
  date?: string;
  userName?: string;
  userPhone?: string;
};

async function playerUpdateBookingSlots(
  id: string,
  body: PlayerUpdateBody,
): Promise<
  | { kind: 'ok'; booking: Awaited<ReturnType<typeof prisma.booking.update>> }
  | { kind: 'err'; httpStatus: number; message: string }
> {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) {
        return { kind: 'err' as const, httpStatus: 404, message: 'Not found' };
      }
      if (existing.userId !== body.userId) {
        return { kind: 'err' as const, httpStatus: 403, message: 'Forbidden' };
      }
      if (existing.status !== 'pending' && existing.status !== 'booked') {
        return {
          kind: 'err' as const,
          httpStatus: 400,
          message: 'Paid or canceled bookings cannot be edited',
        };
      }

      const nextDate =
        typeof body.date === 'string' && body.date.trim().length >= 8
          ? body.date.trim()
          : existing.date;

      await freeSlotsForBooking(tx, existing.venueId, existing.date, existing.slots);

      const resolved = await resolveSlotIdsForReserve(tx, existing.venueId, nextDate, body.slots);
      if (!resolved.ok) {
        const restore = await resolveSlotIdsForReserve(
          tx,
          existing.venueId,
          existing.date,
          existing.slots,
        );
        if (restore.ok) {
          await markSlotsBooked(tx, restore.slotIds, true);
        }
        return { kind: 'err' as const, httpStatus: resolved.status, message: resolved.message };
      }

      await markSlotsBooked(tx, resolved.slotIds, true);

      const data: Prisma.BookingUpdateInput = {
        slots: body.slots as Prisma.InputJsonValue,
        totalPrice: body.totalPrice,
        date: nextDate,
      };
      if (typeof body.userName === 'string' && body.userName.trim()) {
        data.userName = body.userName.trim();
      }
      if (typeof body.userPhone === 'string' && body.userPhone.trim()) {
        data.userPhone = body.userPhone.trim();
      }

      const row = await tx.booking.update({
        where: { id },
        data,
      });
      return { kind: 'ok' as const, booking: row };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  if (
    body &&
    typeof body === 'object' &&
    Array.isArray((body as PlayerUpdateBody).slots) &&
    typeof (body as PlayerUpdateBody).userId === 'string' &&
    typeof (body as PlayerUpdateBody).totalPrice === 'number' &&
    !('status' in body)
  ) {
    try {
      const out = await playerUpdateBookingSlots(id, body as PlayerUpdateBody);
      if (out.kind === 'err') {
        return NextResponse.json({ error: out.message }, { status: out.httpStatus });
      }
      await upsertPlayerProfileFromBooking(out.booking.userName, out.booking.userPhone);
      return NextResponse.json(out.booking);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2034'
      ) {
        return NextResponse.json(
          { error: 'Slot update conflict, please try again' },
          { status: 409 },
        );
      }
      throw e;
    }
  }

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
