import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDatabaseOr503, prismaRouteErrorResponse } from '@/lib/api-db-guard';

export const runtime = 'nodejs';

export async function GET() {
  const denied = guardDatabaseOr503();
  if (denied) return denied;

  try {
    const count = await prisma.venue.count();
    return NextResponse.json({ count });
  } catch (e) {
    return prismaRouteErrorResponse('GET /api/venues/count', e);
  }
}
