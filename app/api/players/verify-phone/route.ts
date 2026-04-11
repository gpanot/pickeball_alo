import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const phone = String(body?.phone ?? '').trim();
    const name = String(body?.name ?? '').trim();

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const existing = await prisma.userProfile.findUnique({
      where: { phone },
      select: { id: true, phoneVerified: true },
    });

    const profile = await prisma.userProfile.upsert({
      where: { phone },
      update: {
        ...(name ? { name } : {}),
        phoneVerified: true,
      },
      create: {
        name: name || 'Player',
        phone,
        savedVenues: [],
        phoneVerified: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerified: true,
        savedVenues: true,
      },
    });

    if (!(existing?.phoneVerified === true) && profile.phoneVerified) {
      await prisma.phoneVerificationEvent.create({
        data: {
          subjectType: 'player',
          subjectId: profile.id,
          phone: profile.phone,
          actorType: 'player',
          actorId: profile.id,
          source: 'mobile-profile-otp',
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('POST /api/players/verify-phone:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
