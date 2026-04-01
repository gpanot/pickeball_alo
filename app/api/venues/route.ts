import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sortSlotsByTime } from '@/lib/formatters';

/** Default “you are here” for radius search (HCMC core) when the client does not send GPS. */
const DEFAULT_REF_LAT = 10.79;
const DEFAULT_REF_LNG = 106.71;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim();
  const date = sp.get('date') || new Date().toISOString().slice(0, 10);
  const sort = sp.get('sort') || 'distance';
  const latParam = sp.get('lat');
  const lngParam = sp.get('lng');
  const lat = latParam != null && latParam !== '' ? parseFloat(latParam) : null;
  const lng = lngParam != null && lngParam !== '' ? parseFloat(lngParam) : null;
  const refLat = lat != null && !Number.isNaN(lat) ? lat : DEFAULT_REF_LAT;
  const refLng = lng != null && !Number.isNaN(lng) ? lng : DEFAULT_REF_LNG;
  const radius = sp.get('radius') ? parseFloat(sp.get('radius')!) : 10;

  const venues = await prisma.venue.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
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

  let results = venues.map((v) => {
    const distance = haversineKm(refLat, refLng, v.lat, v.lng);
    return {
      id: v.id,
      name: v.name,
      address: v.address,
      lat: v.lat,
      lng: v.lng,
      phone: v.phone,
      hours: v.hours,
      rating: v.rating,
      reviewCount: v.reviewCount,
      priceMin: v.priceMin,
      priceMax: v.priceMax,
      tags: v.tags,
      amenities: v.amenities,
      images: v.images,
      facebookUrl: v.facebookUrl,
      instagramUrl: v.instagramUrl,
      tiktokUrl: v.tiktokUrl,
      googleUrl: v.googleUrl,
      distance: Math.round(distance * 10) / 10,
      courts: v.courts.map((c) => ({
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
    };
  });

  results = results.filter((v) => v.distance <= radius);

  if (sort === 'price') {
    results.sort((a, b) => (a.priceMin ?? Infinity) - (b.priceMin ?? Infinity));
  } else if (sort === 'rating') {
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else {
    results.sort((a, b) => a.distance - b.distance);
  }

  return NextResponse.json(results);
}
