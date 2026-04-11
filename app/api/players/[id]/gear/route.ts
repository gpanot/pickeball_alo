import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const EMPTY_GEAR = { cap: null, shirt: null, paddle: null, shoes: null };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const gear = await prisma.playerGear.findUnique({
      where: { playerId: id },
      select: { cap: true, shirt: true, paddle: true, shoes: true },
    });
    return NextResponse.json(gear ?? EMPTY_GEAR);
  } catch (err) {
    console.error('GET /api/players/[id]/gear error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const VALID_KEYS = ['cap', 'shirt', 'paddle', 'shoes'] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const player = await prisma.userProfile.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const data: Record<string, string | null> = {};
    for (const key of VALID_KEYS) {
      const val = body[key];
      data[key] = typeof val === 'string' && val.trim() ? val.trim() : null;
    }

    const gear = await prisma.playerGear.upsert({
      where: { playerId: id },
      update: data,
      create: { playerId: id, ...data },
      select: { cap: true, shirt: true, paddle: true, shoes: true },
    });

    return NextResponse.json(gear);
  } catch (err) {
    console.error('PUT /api/players/[id]/gear error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
