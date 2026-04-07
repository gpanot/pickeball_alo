import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: coachId } = await params;
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.sub !== coachId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const invites = await prisma.coachVenueInvite.findMany({
    where: { coachId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });

  const venueIds = [...new Set(invites.map((i) => i.venueId))];
  const venues =
    venueIds.length === 0
      ? []
      : await prisma.venue.findMany({
          where: { id: { in: venueIds } },
          select: { id: true, name: true, address: true },
        });

  const venueById = new Map(venues.map((v) => [v.id, v]));

  const items = invites.map((invite) => {
    const venue = venueById.get(invite.venueId);
    return {
      id: invite.id,
      coachId: invite.coachId,
      venueId: invite.venueId,
      invitedBy: invite.invitedBy,
      status: invite.status,
      createdAt: invite.createdAt,
      respondedAt: invite.respondedAt,
      venue: venue
        ? { name: venue.name, address: venue.address }
        : { name: null as string | null, address: null as string | null },
    };
  });

  return NextResponse.json({ invites: items });
}
