import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const rows = await prisma.dateOverride.findMany({
    where: { venueId: venueId! },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const body = await req.json();
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const dayType = typeof body.dayType === 'string' ? body.dayType.trim().toLowerCase() : '';
  const note = typeof body.note === 'string' ? body.note.trim() || null : null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !dayType) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) and dayType required' }, { status: 400 });
  }

  const row = await prisma.dateOverride.upsert({
    where: {
      venueId_date: { venueId: venueId!, date },
    },
    create: { venueId: venueId!, date, dayType, note },
    update: { dayType, note },
  });

  return NextResponse.json(row);
}
