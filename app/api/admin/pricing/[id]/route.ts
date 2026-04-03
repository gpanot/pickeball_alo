import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';
import { parsePricingRows } from '@/lib/pricing';
import { parsePricingRowsBody } from '@/lib/admin-pricing-validate';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const existing = await prisma.pricingTable.findFirst({
    where: { id, venueId: venueId! },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Prisma.PricingTableUpdateInput = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (Array.isArray(body.dayTypes)) {
    const dt = body.dayTypes
      .filter((x: unknown) => typeof x === 'string' && x.trim())
      .map((s: string) => s.trim().toLowerCase());
    if (dt.length === 0) {
      return NextResponse.json({ error: 'dayTypes cannot be empty' }, { status: 400 });
    }
    data.dayTypes = dt;
  }
  if (body.rows !== undefined) {
    const rowsParsed = parsePricingRowsBody(body.rows);
    if (!rowsParsed) {
      return NextResponse.json({ error: 'Invalid rows' }, { status: 400 });
    }
    data.rows = rowsParsed as Prisma.InputJsonValue;
  }
  if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const updated = await prisma.pricingTable.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    venueId: updated.venueId,
    name: updated.name,
    dayTypes: updated.dayTypes,
    rows: parsePricingRows(updated.rows),
    sortOrder: updated.sortOrder,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const existing = await prisma.pricingTable.findFirst({
    where: { id, venueId: venueId! },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.pricingTable.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
