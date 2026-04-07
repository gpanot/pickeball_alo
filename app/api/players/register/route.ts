import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const phone = String(body?.phone ?? '').trim();
    const password = String(body?.password ?? '');

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'name, phone, and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await prisma.userProfile.findUnique({ where: { phone } });
    const passwordHash = bcrypt.hashSync(password, 10);

    if (existing?.passwordHash) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    const profile = existing
      ? await prisma.userProfile.update({
          where: { phone },
          data: {
            name,
            passwordHash,
          },
        })
      : await prisma.userProfile.create({
          data: {
            name,
            phone,
            passwordHash,
            savedVenues: [],
          },
        });

    return NextResponse.json(
      {
        profile: {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          savedVenues: profile.savedVenues,
        },
      },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    console.error('Player register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
