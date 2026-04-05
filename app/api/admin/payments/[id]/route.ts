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
  if (body.bankBin === null || body.bankBin === undefined || body.bankBin === '') data.bankBin = null;
  else if (typeof body.bankBin === 'string' && /^\d{6}$/.test(body.bankBin.trim())) {
    data.bankBin = body.bankBin.trim();
  }
  if (typeof body.isDefaultForDynamicQr === 'boolean') data.isDefaultForDynamicQr = body.isDefaultForDynamicQr;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.isDefaultForDynamicQr === true) {
      await tx.venuePayment.updateMany({
        where: { venueId: venueId! },
        data: { isDefaultForDynamicQr: false },
      });
    }
    return tx.venuePayment.update({ where: { id }, data });
  });
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
