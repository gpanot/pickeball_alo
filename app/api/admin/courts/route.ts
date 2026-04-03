import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  const note = typeof body.note === 'string' ? body.note.trim() || null : null;

  const court = await prisma.court.create({
    data: {
      venueId: venueId!,
      name,
      note,
      isAvailable: true,
    },
  });

  return NextResponse.json(court, { status: 201 });
}
