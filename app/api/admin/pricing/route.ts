import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';
import { parsePricingRows } from '@/lib/pricing';
import { parsePricingRowsBody } from '@/lib/admin-pricing-validate';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const tables = await prisma.pricingTable.findMany({
    where: { venueId: venueId! },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(
    tables.map((t) => ({
      id: t.id,
      venueId: t.venueId,
      name: t.name,
      dayTypes: t.dayTypes,
      rows: parsePricingRows(t.rows),
      sortOrder: t.sortOrder,
    })),
  );
}

export async function POST(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const dayTypes = Array.isArray(body.dayTypes)
    ? body.dayTypes.filter((x: unknown) => typeof x === 'string' && x.trim()).map((s: string) => s.trim().toLowerCase())
    : [];
  const rowsParsed = parsePricingRowsBody(body.rows);
  const sortOrder = typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder) ? Math.round(body.sortOrder) : 0;

  if (!name || dayTypes.length === 0 || !rowsParsed) {
    return NextResponse.json(
      { error: 'name, non-empty dayTypes[], and valid rows[] required' },
      { status: 400 },
    );
  }

  const created = await prisma.pricingTable.create({
    data: {
      venueId: venueId!,
      name,
      dayTypes,
      rows: rowsParsed,
      sortOrder,
    },
  });

  return NextResponse.json({
    id: created.id,
    venueId: created.venueId,
    name: created.name,
    dayTypes: created.dayTypes,
    rows: parsePricingRows(created.rows),
    sortOrder: created.sortOrder,
  });
}
