import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params;

  const profile = await prisma.userProfile.findUnique({
    where: { phone: decodeURIComponent(phone) },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    savedVenues: profile.savedVenues,
  });
}
