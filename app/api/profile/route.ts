import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { name, phone, savedVenues } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: 'name and phone required' }, { status: 400 });
  }

  const profile = await prisma.userProfile.upsert({
    where: { phone },
    update: {
      name,
      ...(savedVenues !== undefined ? { savedVenues } : {}),
    },
    create: {
      name,
      phone,
      savedVenues: savedVenues || [],
    },
  });

  return NextResponse.json({
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    savedVenues: profile.savedVenues,
  });
}
