import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.venuePayment.findUnique({ where: { id } });
  if (!existing || existing.venueId !== venueId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.bank === 'string') data.bank = body.bank.slice(0, 120);
  if (typeof body.accountName === 'string') data.accountName = body.accountName.slice(0, 200);
  if (typeof body.accountNumber === 'string') data.accountNumber = body.accountNumber.slice(0, 60);
  if (body.qrImageUrl === null || body.qrImageUrl === undefined) data.qrImageUrl = null;
  else if (typeof body.qrImageUrl === 'string') data.qrImageUrl = body.qrImageUrl.slice(0, 500);

  const updated = await prisma.venuePayment.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const { id } = await params;
  const existing = await prisma.venuePayment.findUnique({ where: { id } });
  if (!existing || existing.venueId !== venueId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.venuePayment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
