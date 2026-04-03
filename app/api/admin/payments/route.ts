import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const payments = await prisma.venuePayment.findMany({
    where: { venueId: venueId! },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const body = await req.json();
  if (!body?.bank || !body?.accountName || !body?.accountNumber) {
    return NextResponse.json({ error: 'bank, accountName, accountNumber required' }, { status: 400 });
  }

  const count = await prisma.venuePayment.count({ where: { venueId: venueId! } });

  const payment = await prisma.venuePayment.create({
    data: {
      venueId: venueId!,
      bank: String(body.bank).slice(0, 120),
      accountName: String(body.accountName).slice(0, 200),
      accountNumber: String(body.accountNumber).slice(0, 60),
      qrImageUrl: body.qrImageUrl ? String(body.qrImageUrl).slice(0, 500) : null,
      sortOrder: count,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
