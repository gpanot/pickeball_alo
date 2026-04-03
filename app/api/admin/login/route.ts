import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createAdminSession } from '@/lib/admin-session';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const venueId = typeof body.venueId === 'string' ? body.venueId : '';
  const pin = body.pin != null ? String(body.pin) : '';

  if (!venueId || !pin) {
    return NextResponse.json({ error: 'venueId and pin required' }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, name: true, adminPin: true },
  });

  if (!venue?.adminPin || !bcrypt.compareSync(pin, venue.adminPin)) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 });
  }

  let token: string;
  try {
    token = createAdminSession(venue.id);
  } catch {
    return NextResponse.json(
      { error: 'Server misconfigured: set ADMIN_SESSION_SECRET' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    token,
    venueId: venue.id,
    venueName: venue.name,
  });
}
