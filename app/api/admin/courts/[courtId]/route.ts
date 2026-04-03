import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function PATCH(
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
  const data: { name?: string; note?: string | null; isAvailable?: boolean } = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (body.note !== undefined) {
    data.note = typeof body.note === 'string' ? body.note.trim() || null : null;
  }
  if (typeof body.isAvailable === 'boolean') data.isAvailable = body.isAvailable;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const updated = await prisma.court.update({
    where: { id: courtId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
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

  await prisma.court.delete({ where: { id: courtId } });
  return NextResponse.json({ ok: true });
}
