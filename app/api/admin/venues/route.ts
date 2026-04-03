import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminVenuePickerWhere } from '@/lib/venue-search';

/**
 * Admin login venue picker (id + name only).
 * Use `?q=` for search — avoids loading thousands of rows in one response (was breaking the dropdown).
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();

  const venues = await prisma.venue.findMany({
    where: adminVenuePickerWhere(q),
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: q ? 400 : 150,
  });

  return NextResponse.json(venues);
}
