import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

type SlotInput = { time: string; price: number; memberPrice?: number | null; isBooked: boolean };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courtId: string }> },
) {
  const { courtId } = await params;
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const court = await prisma.court.findFirst({
    where: { id: courtId, venueId: venueId! },
  });
  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 });
  }

  const body = await req.json();
  const date = typeof body.date === 'string' ? body.date : '';
  const slots = body.slots;
  if (!date || !Array.isArray(slots)) {
    return NextResponse.json({ error: 'date and slots array required' }, { status: 400 });
  }

  const normalized: SlotInput[] = [];
  for (const s of slots) {
    if (!s || typeof s !== 'object') continue;
    const time = typeof (s as { time: unknown }).time === 'string' ? (s as { time: string }).time : '';
    const price = Number((s as { price: unknown }).price);
    const isBooked = Boolean((s as { isBooked: unknown }).isBooked);
    let memberPrice: number | null | undefined;
    if ('memberPrice' in (s as object)) {
      const mp = (s as { memberPrice: unknown }).memberPrice;
      if (mp == null) memberPrice = null;
      else if (typeof mp === 'number' && Number.isFinite(mp)) memberPrice = Math.round(mp);
    }
    if (!time || !Number.isFinite(price)) {
      return NextResponse.json({ error: 'Each slot needs time and numeric price' }, { status: 400 });
    }
    normalized.push({ time, price: Math.round(price), memberPrice, isBooked });
  }

  await prisma.$transaction(async (tx) => {
    for (const s of normalized) {
      const existing = await tx.timeSlot.findFirst({
        where: { courtId, date, time: s.time },
      });
      if (existing) {
        await tx.timeSlot.update({
          where: { id: existing.id },
          data: {
            price: s.price,
            isBooked: s.isBooked,
            ...(s.memberPrice !== undefined ? { memberPrice: s.memberPrice } : {}),
          },
        });
      } else {
        await tx.timeSlot.create({
          data: {
            courtId,
            date,
            time: s.time,
            price: s.price,
            memberPrice: s.memberPrice ?? null,
            isBooked: s.isBooked,
          },
        });
      }
    }
  });

  const updated = await prisma.timeSlot.findMany({
    where: { courtId, date },
    orderBy: { time: 'asc' },
  });

  return NextResponse.json(updated);
}
