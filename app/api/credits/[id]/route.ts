import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const credit = await prisma.credit.findUnique({
    where: { id },
    include: { coach: { select: { name: true } } },
  });
  if (!credit) {
    return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
  }
  return NextResponse.json(credit);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const action = body?.action as string | undefined;

  if (action !== 'confirm') {
    return NextResponse.json({ error: 'action must be confirm' }, { status: 400 });
  }

  const existing = await prisma.credit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
  }
  if (existing.coachId !== auth.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const credit = await prisma.credit.update({
    where: { id },
    data: { paymentStatus: 'confirmed' },
    include: { coach: { select: { name: true } } },
  });

  return NextResponse.json(credit);
}
