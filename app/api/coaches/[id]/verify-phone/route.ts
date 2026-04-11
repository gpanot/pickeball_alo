import prisma from '@/lib/prisma';
import { requireCoach } from '@/lib/coach-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const coachAuth = requireCoach(req);
    if (coachAuth instanceof NextResponse) return coachAuth;

    const { id } = await params;
    if (coachAuth.sub !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.coach.findUnique({
      where: { id },
      select: { id: true, phone: true, phoneVerified: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const updated = await prisma.coach.update({
      where: { id },
      data: { phoneVerified: true },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        phoneVerified: true,
        gender: true,
        photo: true,
        bio: true,
        specialties: true,
        certifications: true,
        subscriptionPlan: true,
        subscriptionExpires: true,
        hourlyRate1on1: true,
        hourlyRateGroup: true,
        ratingOverall: true,
        reviewCount: true,
        isActive: true,
      },
    });

    if (!existing.phoneVerified && updated.phoneVerified) {
      await prisma.phoneVerificationEvent.create({
        data: {
          subjectType: 'coach',
          subjectId: updated.id,
          phone: existing.phone,
          actorType: 'coach',
          actorId: coachAuth.sub,
          source: 'mobile-profile-otp',
        },
      });
    }

    return NextResponse.json({ coach: updated });
  } catch (err) {
    console.error('POST /api/coaches/[id]/verify-phone:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

