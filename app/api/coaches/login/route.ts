import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signCoachToken } from '@/lib/coach-session';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'phone and password are required' }, { status: 400 });
    }

    const coach = await prisma.coach.findUnique({ where: { phone } });
    if (!coach) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!bcrypt.compareSync(password, coach.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signCoachToken(coach.id, coach.phone, coach.subscriptionPlan);

    return NextResponse.json({
      token,
      coach: {
        id: coach.id,
        name: coach.name,
        phone: coach.phone,
        email: coach.email,
        photo: coach.photo,
        bio: coach.bio,
        certifications: coach.certifications,
        specialties: coach.specialties,
        subscriptionPlan: coach.subscriptionPlan,
        subscriptionExpires: coach.subscriptionExpires,
        hourlyRate1on1: coach.hourlyRate1on1,
        hourlyRateGroup: coach.hourlyRateGroup,
        ratingOverall: coach.ratingOverall,
        reviewCount: coach.reviewCount,
        isActive: coach.isActive,
      },
    });
  } catch (err) {
    console.error('Coach login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
