import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/lib/generated/prisma/client';
import { parseBearerToken } from '@/lib/admin-auth';
import { validateAdminToken } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { upsertPlayerProfileFromBooking } from '@/lib/player-profile-sync';
import { freeSlotsForBooking, markSlotsBooked, resolveSlotIdsForReserve } from '@/lib/slot-sync';
import { autoCancelExpiredBookings } from '@/lib/booking-deadline';

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

  await autoCancelExpiredBookings(prisma, { bookingId: id });

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
      if (existing.status !== 'pending') {
        return {
          kind: 'err' as const,
          httpStatus: 400,
          message: 'Only pending bookings can be edited',
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

  const bodyStatus = body as {
    status?: string;
    userId?: string;
    adminNote?: string;
    paymentNote?: string;
    paymentProofUrl?: string;
    reviewedBy?: string;
  };

  const { status } = bodyStatus;

  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'status required' }, { status: 400 });
  }

  type TxResult =
    | { kind: 'ok'; booking: Awaited<ReturnType<typeof prisma.booking.update>> }
    | { kind: 'err'; message: string; httpStatus: number };

  const token = parseBearerToken(req);

  const updated: TxResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({ where: { id } });
    if (!existing) {
      return { kind: 'err', message: 'Not found', httpStatus: 404 };
    }

    const isAdmin = validateAdminToken(token, existing.venueId);
    const playerUserId =
      typeof bodyStatus.userId === 'string' && bodyStatus.userId.trim()
        ? bodyStatus.userId.trim()
        : null;
    const isOwner = playerUserId != null && playerUserId === existing.userId;

    const now = new Date();
    const reviewedBy = resolveReviewedBy(bodyStatus, status);

    const data: Prisma.BookingUpdateInput = { status };

    if (existing.status === 'pending' && status === 'payment_submitted') {
      if (isAdmin) {
        return { kind: 'err', message: 'Forbidden', httpStatus: 403 };
      }
      if (!isOwner) {
        return { kind: 'err', message: 'Forbidden', httpStatus: 403 };
      }
      if (
        typeof bodyStatus.paymentProofUrl !== 'string' ||
        !bodyStatus.paymentProofUrl.trim()
      ) {
        return {
          kind: 'err',
          message: 'Payment proof screenshot is required',
          httpStatus: 400,
        };
      }
      data.paymentSubmittedAt = now;
      data.paymentProofUrl = bodyStatus.paymentProofUrl;
    } else if (existing.status === 'pending' && status === 'canceled') {
      if (!isAdmin && !isOwner) {
        return { kind: 'err', message: 'Forbidden', httpStatus: 403 };
      }
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
      if (typeof bodyStatus.adminNote === 'string') {
        data.adminNote = bodyStatus.adminNote.trim() || null;
      }
      await freeSlotsForBooking(tx, existing.venueId, existing.date, existing.slots);
    } else if (existing.status === 'payment_submitted' && status === 'paid') {
      if (!isAdmin) {
        return { kind: 'err', message: 'Unauthorized', httpStatus: 401 };
      }
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
      data.paymentConfirmedAt = now;
    } else if (existing.status === 'payment_submitted' && status === 'pending') {
      if (!isAdmin) {
        return { kind: 'err', message: 'Unauthorized', httpStatus: 401 };
      }
      data.paymentSubmittedAt = null;
      if (typeof bodyStatus.paymentNote === 'string' && bodyStatus.paymentNote.trim()) {
        data.paymentNote = bodyStatus.paymentNote.trim();
      }
    } else if (existing.status === 'payment_submitted' && status === 'canceled') {
      if (!isOwner && !isAdmin) {
        return { kind: 'err', message: 'Forbidden', httpStatus: 403 };
      }
      data.reviewedAt = now;
      data.reviewedBy = reviewedBy;
      if (typeof bodyStatus.adminNote === 'string') {
        data.adminNote = bodyStatus.adminNote.trim() || null;
      }
      await freeSlotsForBooking(tx, existing.venueId, existing.date, existing.slots);
    } else {
      return {
        kind: 'err',
        message: `Cannot transition from ${existing.status} to ${status}`,
        httpStatus: 400,
      };
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
