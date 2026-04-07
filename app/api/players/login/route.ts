import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body?.phone ?? '').trim();
    const password = String(body?.password ?? '');

    if (!phone || !password) {
      return NextResponse.json({ error: 'phone and password are required' }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({ where: { phone } });
    if (!profile?.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = bcrypt.compareSync(password, profile.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        savedVenues: profile.savedVenues,
      },
    });
  } catch (err) {
    console.error('Player login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
