import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sortSlotsByTime } from '@/lib/formatters';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      courts: {
        include: {
          slots: {
            where: { date },
            orderBy: { time: 'asc' },
          },
        },
      },
    },
  });

  if (!venue) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
    courts: venue.courts.map((c) => ({
      id: c.id,
      name: c.name,
      note: c.note,
      isAvailable: c.isAvailable,
      slots: sortSlotsByTime(
        c.slots.map((s) => ({
          id: s.id,
          time: s.time,
          price: s.price,
          isBooked: s.isBooked,
        })),
      ),
    })),
  });
}
