import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  const { status } = body;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const allowed: Record<string, string[]> = {
    pending: ['canceled', 'booked'],
    booked: ['canceled', 'paid'],
  };

  if (!allowed[existing.status]?.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${existing.status} to ${status}` },
      { status: 400 },
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
