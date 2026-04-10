import prisma from '@/lib/prisma';
import { requireCoach } from '@/lib/coach-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const packs = await prisma.creditPack.findMany({
      where: { coachId: id },
      orderBy: { price: 'asc' },
    });
    return NextResponse.json({ packs });
  } catch (err) {
    console.error('GET /api/coaches/[id]/credit-packs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = requireCoach(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (auth.sub !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { name, creditCount, price, discountPercent } = body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (typeof creditCount !== 'number' || !Number.isInteger(creditCount) || creditCount < 1) {
      return NextResponse.json({ error: 'creditCount must be a positive integer' }, { status: 400 });
    }
    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) {
      return NextResponse.json({ error: 'price must be a non-negative integer' }, { status: 400 });
    }

    const disc =
      discountPercent != null && typeof discountPercent === 'number' && Number.isInteger(discountPercent) && discountPercent >= 0
        ? discountPercent
        : null;

    const pack = await prisma.creditPack.create({
      data: {
        coachId: id,
        name: name.trim(),
        creditCount,
        price,
        discountPercent: disc,
        isActive: true,
      },
    });

    return NextResponse.json({ pack }, { status: 201 });
  } catch (err) {
    console.error('POST /api/coaches/[id]/credit-packs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = requireCoach(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (auth.sub !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { packId, name, creditCount, price, discountPercent, isActive } = body as Record<string, unknown>;

    if (typeof packId !== 'string') {
      return NextResponse.json({ error: 'packId is required' }, { status: 400 });
    }

    const existing = await prisma.creditPack.findFirst({
      where: { id: packId, coachId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof creditCount === 'number' && Number.isInteger(creditCount) && creditCount >= 1) data.creditCount = creditCount;
    if (typeof price === 'number' && Number.isInteger(price) && price >= 0) data.price = price;
    if (discountPercent === null) data.discountPercent = null;
    else if (typeof discountPercent === 'number' && Number.isInteger(discountPercent) && discountPercent >= 0) data.discountPercent = discountPercent;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const pack = await prisma.creditPack.update({
      where: { id: packId },
      data,
    });

    return NextResponse.json({ pack });
  } catch (err) {
    console.error('PATCH /api/coaches/[id]/credit-packs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = requireCoach(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (auth.sub !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const packId = req.nextUrl.searchParams.get('packId');
    if (!packId) {
      return NextResponse.json({ error: 'packId query param required' }, { status: 400 });
    }

    const existing = await prisma.creditPack.findFirst({
      where: { id: packId, coachId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    await prisma.creditPack.delete({ where: { id: packId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/coaches/[id]/credit-packs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
