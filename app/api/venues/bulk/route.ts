/**
 * GET /api/venues/bulk?since=ISO_TIMESTAMP
 *
 * Returns all venue metadata (no slots) for offline caching.
 * With `since`, returns only venues updated after that timestamp (delta sync).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parsePricingRows } from '@/lib/pricing';
import { guardDatabaseOr503, prismaRouteErrorResponse } from '@/lib/api-db-guard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const denied = guardDatabaseOr503();
  if (denied) return denied;

  const since = req.nextUrl.searchParams.get('since');

  const where = since ? { updatedAt: { gt: new Date(since) } } : {};

  let venues;
  try {
    venues = await prisma.venue.findMany({
    where,
    include: {
      courts: { select: { id: true, name: true, note: true, isAvailable: true } },
      pricingTables: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
    });
  } catch (e) {
    return prismaRouteErrorResponse('GET /api/venues/bulk', e);
  }

  const now = new Date().toISOString();

  const data = venues.map((v) => ({
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
    hasMemberPricing: v.hasMemberPricing,
    use30MinSlots: v.use30MinSlots,
    aloboSlug: v.aloboSlug,
    pricingTables: v.pricingTables.map((t) => ({
      id: t.id,
      name: t.name,
      dayTypes: t.dayTypes,
      sortOrder: t.sortOrder,
      rows: parsePricingRows(t.rows),
    })),
    courts: v.courts.map((c) => ({
      id: c.id,
      name: c.name,
      note: c.note,
      isAvailable: c.isAvailable,
      slots: [],
    })),
    updatedAt: v.updatedAt.toISOString(),
  }));

  return NextResponse.json({ syncedAt: now, venues: data });
}
