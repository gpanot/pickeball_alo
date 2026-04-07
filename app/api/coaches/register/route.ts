import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signCoachToken } from '@/lib/coach-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, password, email, hourlyRate1on1 } = body;
    const normalizedPhone = String(phone ?? '').trim();
    const normalizedName = String(name ?? '').trim();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedName || !normalizedPhone || !password || hourlyRate1on1 == null) {
      return NextResponse.json(
        { error: 'name, phone, password, and hourlyRate1on1 are required' },
        { status: 400 },
      );
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const parsedRate = Number(hourlyRate1on1);
    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      return NextResponse.json({ error: 'hourlyRate1on1 must be a valid non-negative number' }, { status: 400 });
    }

    const parsedRateGroup =
      body.hourlyRateGroup == null || body.hourlyRateGroup === ''
        ? null
        : Number(body.hourlyRateGroup);
    if (parsedRateGroup != null && (!Number.isFinite(parsedRateGroup) || parsedRateGroup < 0)) {
      return NextResponse.json({ error: 'hourlyRateGroup must be a valid non-negative number' }, { status: 400 });
    }

    const arrayFromBody = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean) : [];
    const specialties = arrayFromBody(body.specialties);
    const certifications = arrayFromBody(body.certifications);
    const languages = arrayFromBody(body.languages);
    const focusLevels = arrayFromBody(body.focusLevels);
    const groupSizes = arrayFromBody(body.groupSizes);
    const experienceBand =
      typeof body.experienceBand === 'string' && body.experienceBand.trim().length > 0
        ? body.experienceBand.trim()
        : null;

    const existing = await prisma.coach.findUnique({ where: { phone: normalizedPhone } });
    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    if (normalizedEmail) {
      const existingEmail = await prisma.coach.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const coach = await prisma.coach.create({
      data: {
        name: normalizedName,
        phone: normalizedPhone,
        email: normalizedEmail || null,
        passwordHash,
        hourlyRate1on1: parsedRate,
        hourlyRateGroup: parsedRateGroup,
        bio: body.bio || null,
        certifications,
        specialties,
        languages,
        focusLevels,
        groupSizes,
        experienceBand,
      },
    });

    let token: string;
    try {
      token = signCoachToken(coach.id, coach.phone, coach.subscriptionPlan);
    } catch (e) {
      if (e instanceof Error && e.message === 'COACH_JWT_SECRET_MISSING') {
        await prisma.coach.delete({ where: { id: coach.id } }).catch(() => {});
        return NextResponse.json(
          {
            error:
              'Coach registration is temporarily unavailable: set COACH_JWT_SECRET in the server environment (Vercel → Settings → Environment Variables).',
          },
          { status: 503 },
        );
      }
      throw e;
    }

    return NextResponse.json({
      token,
      coach: {
        id: coach.id,
        name: coach.name,
        phone: coach.phone,
        email: coach.email,
        subscriptionPlan: coach.subscriptionPlan,
        hourlyRate1on1: coach.hourlyRate1on1,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('Coach register error:', err);
    if (err instanceof Error && err.message === 'COACH_JWT_SECRET_MISSING') {
      return NextResponse.json(
        {
          error:
            'Coach registration is temporarily unavailable: set COACH_JWT_SECRET in the server environment.',
        },
        { status: 503 },
      );
    }
    if (err && typeof err === 'object' && 'code' in err) {
      const code = String((err as { code?: string }).code ?? '');
      if (code === 'P2002') {
        return NextResponse.json({ error: 'Phone or email already registered' }, { status: 409 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
