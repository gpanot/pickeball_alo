import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const { id: coachId, inviteId } = await params;
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.sub !== coachId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.action !== 'accept' && body.action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
  }

  const invite = await prisma.coachVenueInvite.findFirst({
    where: { id: inviteId, coachId },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invite is no longer pending' }, { status: 400 });
  }

  const now = new Date();

  if (body.action === 'decline') {
    const updated = await prisma.coachVenueInvite.update({
      where: { id: inviteId },
      data: { status: 'declined', respondedAt: now },
    });
    return NextResponse.json(updated);
  }

  const existingLink = await prisma.coachCourtLink.findUnique({
    where: {
      coachId_venueId: { coachId, venueId: invite.venueId },
    },
  });

  if (existingLink) {
    return NextResponse.json(
      { error: 'Court link already exists for this venue' },
      { status: 409 },
    );
  }

  const [updatedInvite, link] = await prisma.$transaction([
    prisma.coachVenueInvite.update({
      where: { id: inviteId },
      data: { status: 'accepted', respondedAt: now },
    }),
    prisma.coachCourtLink.create({
      data: {
        coachId,
        venueId: invite.venueId,
        courtIds: [],
        isActive: true,
      },
    }),
  ]);

  return NextResponse.json({ invite: updatedInvite, link });
}
