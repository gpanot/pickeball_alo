import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function geoBoundingWhere(refLat: number, refLng: number, radiusKm: number): Prisma.VenueWhereInput {
  const pad = 1.1;
  const r = radiusKm * pad;
  const dLat = r / 111.32;
  const cosLat = Math.cos((refLat * Math.PI) / 180);
  const dLng = r / (111.32 * Math.max(cosLat, 0.12));
  return {
    lat: { gte: refLat - dLat, lte: refLat + dLat },
    lng: { gte: refLng - dLng, lte: refLng + dLng },
  };
}

function listableCoachWhere(now: Date): Prisma.CoachWhereInput {
  return {
    isActive: true,
    isProfilePublic: true,
    phoneVerified: true,
    OR: [
      { subscriptionPlan: 'trial', trialBookingsUsed: { lt: 10 } },
      {
        subscriptionPlan: { in: ['standard', 'pro'] },
        subscriptionExpires: { gt: now },
      },
    ],
  };
}

const coachListSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  photo: true,
  bio: true,
  certifications: true,
  specialties: true,
  languages: true,
  focusLevels: true,
  groupSizes: true,
  experienceBand: true,
  yearsExperience: true,
  responseHint: true,
  ratingOverall: true,
  ratingOnTime: true,
  ratingFriendly: true,
  ratingProfessional: true,
  ratingRecommend: true,
  reviewCount: true,
  isProfilePublic: true,
  hourlyRate1on1: true,
  hourlyRateGroup: true,
  maxGroupSize: true,
  cancellationHours: true,
  creditExpiryDays: true,
  courtLinks: {
    where: { isActive: true },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
          priceMin: true,
          _count: { select: { courts: true } },
        },
      },
    },
  },
} satisfies Prisma.CoachSelect;

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim();
    const specialtyRaw = (sp.get('specialty') || '').trim();
    const specialties = specialtyRaw
      ? specialtyRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const minRatingParam = sp.get('minRating');
    const maxPriceParam = sp.get('maxPrice');
    const latParam = sp.get('lat');
    const lngParam = sp.get('lng');
    const radiusParam = sp.get('radius');
    const sort = sp.get('sort') === 'price' ? 'price' : 'rating';
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '20', 10) || 20));
    const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);

    const now = new Date();
    const andParts: Prisma.CoachWhereInput[] = [listableCoachWhere(now)];

    if (q) {
      andParts.push({ name: { contains: q, mode: 'insensitive' } });
    }

    if (specialties.length === 1) {
      andParts.push({ specialties: { has: specialties[0] } });
    } else if (specialties.length > 1) {
      andParts.push({ specialties: { hasEvery: specialties } });
    }

    if (minRatingParam != null && minRatingParam !== '') {
      const minRating = parseFloat(minRatingParam);
      if (!Number.isNaN(minRating)) {
        andParts.push({
          AND: [{ ratingOverall: { not: null } }, { ratingOverall: { gte: minRating } }],
        });
      }
    }

    if (maxPriceParam != null && maxPriceParam !== '') {
      const maxPrice = parseInt(maxPriceParam, 10);
      if (!Number.isNaN(maxPrice)) {
        andParts.push({ hourlyRate1on1: { lte: maxPrice } });
      }
    }

    const lat = latParam != null && latParam !== '' ? parseFloat(latParam) : NaN;
    const lng = lngParam != null && lngParam !== '' ? parseFloat(lngParam) : NaN;
    const radiusKm = radiusParam != null && radiusParam !== '' ? parseFloat(radiusParam) : NaN;

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && !Number.isNaN(radiusKm) && radiusKm > 0) {
      const venuesInBox = await prisma.venue.findMany({
        where: geoBoundingWhere(lat, lng, radiusKm),
        select: { id: true, lat: true, lng: true },
      });
      const venueIdsInRadius = venuesInBox
        .filter((v) => haversineKm(lat, lng, v.lat, v.lng) <= radiusKm)
        .map((v) => v.id);

      if (venueIdsInRadius.length === 0) {
        return NextResponse.json({ coaches: [], total: 0 });
      }

      andParts.push({
        courtLinks: {
          some: {
            isActive: true,
            venueId: { in: venueIdsInRadius },
          },
        },
      });
    }

    const where: Prisma.CoachWhereInput = { AND: andParts };

    const orderBy: Prisma.CoachOrderByWithRelationInput[] =
      sort === 'price'
        ? [{ hourlyRate1on1: 'asc' }, { name: 'asc' }]
        : [
            { ratingOverall: { sort: 'desc', nulls: 'last' } },
            { name: 'asc' },
          ];

    const [coaches, total] = await Promise.all([
      prisma.coach.findMany({
        where,
        select: coachListSelect,
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.coach.count({ where }),
    ]);

    return NextResponse.json({ coaches, total });
  } catch (err) {
    console.error('GET /api/coaches:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
