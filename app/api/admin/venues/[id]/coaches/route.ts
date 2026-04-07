import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminVenue } from '@/lib/admin-auth';

const coachPublicSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  photo: true,
  bio: true,
  certifications: true,
  specialties: true,
  ratingOverall: true,
  isActive: true,
  hourlyRate1on1: true,
  hourlyRateGroup: true,
  maxGroupSize: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: venueId } = await params;
  const qVenueId = req.nextUrl.searchParams.get('venueId') || venueId;
  const authError = requireAdminVenue(req, qVenueId);
  if (authError) return authError;

  const links = await prisma.coachCourtLink.findMany({
    where: { venueId: qVenueId },
    include: {
      coach: { select: coachPublicSelect },
    },
    orderBy: { id: 'asc' },
  });

  return NextResponse.json(links);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: venueId } = await params;
  const qVenueId = req.nextUrl.searchParams.get('venueId') || venueId;
  const authError = requireAdminVenue(req, qVenueId);
  if (authError) return authError;

  let body: { coachPhone?: string; coachId?: string };
  try {
    body = (await req.json()) as { coachPhone?: string; coachId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const phone = typeof body.coachPhone === 'string' ? body.coachPhone.trim() : '';
  const coachId = typeof body.coachId === 'string' ? body.coachId.trim() : '';

  if (!phone && !coachId) {
    return NextResponse.json(
      { error: 'Provide coachPhone or coachId' },
      { status: 400 },
    );
  }

  const coach = await prisma.coach.findFirst({
    where: coachId ? { id: coachId } : { phone },
  });

  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  const existing = await prisma.coachVenueInvite.findUnique({
    where: {
      coachId_venueId: { coachId: coach.id, venueId: qVenueId },
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'Invite already exists' }, { status: 409 });
  }

  const invite = await prisma.coachVenueInvite.create({
    data: {
      coachId: coach.id,
      venueId: qVenueId,
      invitedBy: qVenueId,
      status: 'pending',
    },
    include: { coach: { select: coachPublicSelect } },
  });

  return NextResponse.json(invite, { status: 201 });
}
