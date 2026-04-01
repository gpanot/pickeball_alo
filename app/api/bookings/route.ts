import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  const booking = await prisma.booking.create({
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

  return NextResponse.json(booking, { status: 201 });
}
