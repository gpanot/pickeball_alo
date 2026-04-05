import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sortSlotsByTime } from '@/lib/formatters';
import { parsePricingRows } from '@/lib/pricing';
import { computeCourtSlots, loadVenueSlotBookState } from '@/lib/venue-slots';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      courts: true,
      pricingTables: { orderBy: { sortOrder: 'asc' } },
      dateOverrides: true,
      payments: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!venue) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const bookState = await loadVenueSlotBookState(venue.id, date);
  const pricingLite = venue.pricingTables.map((t) => ({
    dayTypes: t.dayTypes,
    sortOrder: t.sortOrder,
    rows: t.rows,
  }));

  return NextResponse.json({
    id: venue.id,
    name: venue.name,
    address: venue.address,
    lat: venue.lat,
    lng: venue.lng,
    phone: venue.phone,
    hours: venue.hours,
    rating: venue.rating,
    reviewCount: venue.reviewCount,
    priceMin: venue.priceMin,
    priceMax: venue.priceMax,
    tags: venue.tags,
    amenities: venue.amenities,
    images: venue.images,
    facebookUrl: venue.facebookUrl,
    instagramUrl: venue.instagramUrl,
    tiktokUrl: venue.tiktokUrl,
    googleUrl: venue.googleUrl,
    hasMemberPricing: venue.hasMemberPricing,
    use30MinSlots: venue.use30MinSlots,
    pricingTables: venue.pricingTables.map((t) => ({
      id: t.id,
      name: t.name,
      dayTypes: t.dayTypes,
      sortOrder: t.sortOrder,
      rows: parsePricingRows(t.rows),
    })),
    payments: venue.payments.map((p) => ({
      id: p.id,
      bank: p.bank,
      accountName: p.accountName,
      accountNumber: p.accountNumber,
      qrImageUrl: p.qrImageUrl,
      bankBin: p.bankBin,
      isDefaultForDynamicQr: p.isDefaultForDynamicQr,
      sortOrder: p.sortOrder,
    })),
    courts: venue.courts.map((c) => ({
      id: c.id,
      name: c.name,
      note: c.note,
      isAvailable: c.isAvailable,
      slots: sortSlotsByTime(
        computeCourtSlots(c, date, pricingLite, venue.dateOverrides, bookState, {
          use30MinSlots: venue.use30MinSlots,
        }),
      ),
    })),
  });
}
