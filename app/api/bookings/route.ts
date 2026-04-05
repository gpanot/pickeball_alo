import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';
import { upsertPlayerProfileFromBooking } from '@/lib/player-profile-sync';
import { markSlotsBooked, resolveSlotIdsForReserve } from '@/lib/slot-sync';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { venueId, venueName, venuePhone, venueAddress, userId, userName, userPhone, date, slots, totalPrice, notes } =
    body;

  if (!venueId || !userId || !userName || !userPhone || !date || !slots || !totalPrice) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const resolved = await resolveSlotIdsForReserve(tx, venueId, date, slots);
        if (!resolved.ok) {
          throw new HttpError(resolved.status, resolved.message);
        }

        const created = await tx.booking.create({
          data: {
            venueId,
            venueName,
            venuePhone: venuePhone || null,
            venueAddress: venueAddress || null,
            userId,
            userName,
            userPhone,
            date,
            slots,
            totalPrice,
            notes: notes || null,
            status: 'pending',
          },
        });

        await markSlotsBooked(tx, resolved.slotIds, true);
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await upsertPlayerProfileFromBooking(booking.userName, booking.userPhone);

    return NextResponse.json(booking, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code: string }).code === 'P2034'
    ) {
      return NextResponse.json(
        { error: 'Slot reservation conflict, please try again' },
        { status: 409 },
      );
    }
    throw e;
  }
}
