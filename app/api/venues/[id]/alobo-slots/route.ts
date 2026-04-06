/**
 * GET /api/venues/[id]/alobo-slots?date=YYYY-MM-DD
 *
 * Returns real-time AloBo booked/locked slot data for a venue.
 * Isolated route: safe to delete without affecting other API routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  fetchOnetimeBookings,
  fetchScheduleBookings,
  fetchLockedYards,
} from '@/lib/alobo/client';
import {
  convertBookingsToOverlay,
  convertLocksToOverlay,
  overlayToKeySet,
} from '@/lib/alobo/slots';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const date =
    req.nextUrl.searchParams.get('date') ||
    new Date().toISOString().slice(0, 10);
  const month = date.slice(0, 7);

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      aloboSlug: true,
      courts: { select: { name: true, aloboId: true } },
    },
  });

  if (!venue || !venue.aloboSlug) {
    return NextResponse.json({ supported: false });
  }

  const aloboIdToName = new Map<string, string>();
  for (const c of venue.courts) {
    if (c.aloboId) aloboIdToName.set(c.aloboId, c.name);
  }

  try {
    const [onetime, schedule, locks] = await Promise.all([
      fetchOnetimeBookings(venue.aloboSlug, date),
      fetchScheduleBookings(venue.aloboSlug, month),
      fetchLockedYards(venue.aloboSlug),
    ]);

    const overlays = [
      ...convertBookingsToOverlay(onetime, 'booking', date),
      ...convertBookingsToOverlay(schedule, 'schedule', date),
      ...convertLocksToOverlay(locks, date),
    ];

    const bookedKeys = [...overlayToKeySet(overlays, aloboIdToName)];

    return NextResponse.json({
      supported: true,
      fetchedAt: new Date().toISOString(),
      bookedKeys,
    });
  } catch (err) {
    console.error('AloBo slot fetch failed:', err);
    return NextResponse.json({
      supported: true,
      fetchedAt: new Date().toISOString(),
      bookedKeys: [],
      error: 'Failed to fetch AloBo data',
    });
  }
}
