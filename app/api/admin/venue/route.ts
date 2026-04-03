import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';
import { geocodeAddress } from '@/lib/geocode';

const ALLOWED = new Set([
  'name',
  'address',
  'phone',
  'hours',
  'tags',
  'amenities',
  'facebookUrl',
  'instagramUrl',
  'tiktokUrl',
  'googleUrl',
  'hasMemberPricing',
  'use30MinSlots',
]);

export async function PUT(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const body = await req.json();
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const data: Prisma.VenueUpdateInput = {};
  let addressChanged = false;
  let newAddress = '';

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) continue;
    const v = (body as Record<string, unknown>)[key];
    if (key === 'tags' || key === 'amenities') {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        (data as Record<string, unknown>)[key] = v;
      }
    } else if (key === 'hasMemberPricing' || key === 'use30MinSlots') {
      if (typeof v === 'boolean') {
        (data as Record<string, unknown>)[key] = v;
      }
    } else if (
      key === 'phone' ||
      key === 'hours' ||
      key === 'facebookUrl' ||
      key === 'instagramUrl' ||
      key === 'tiktokUrl' ||
      key === 'googleUrl'
    ) {
      if (v === null || v === undefined) (data as Record<string, unknown>)[key] = null;
      else if (typeof v === 'string') (data as Record<string, unknown>)[key] = v;
    } else if (key === 'name') {
      if (typeof v === 'string') (data as Record<string, unknown>)[key] = v;
    } else if (key === 'address') {
      if (typeof v === 'string') {
        (data as Record<string, unknown>)[key] = v;
        addressChanged = true;
        newAddress = v;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  if (addressChanged && newAddress.trim()) {
    const existing = await prisma.venue.findUnique({
      where: { id: venueId! },
      select: { address: true },
    });
    if (existing && existing.address !== newAddress.trim()) {
      const coords = await geocodeAddress(newAddress.trim());
      if (coords) {
        (data as Record<string, unknown>)['lat'] = coords.lat;
        (data as Record<string, unknown>)['lng'] = coords.lng;
      }
    }
  }

  const venue = await prisma.venue.update({
    where: { id: venueId! },
    data,
  });

  return NextResponse.json(venue);
}

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  const err = requireAdminVenue(req, venueId);
  if (err) return err;

  const venue = await prisma.venue.findUnique({ where: { id: venueId! } });
  if (!venue) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { adminPin: _pin, ...safe } = venue;
  return NextResponse.json(safe);
}
