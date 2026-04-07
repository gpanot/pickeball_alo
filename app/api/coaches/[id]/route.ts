import prisma from '@/lib/prisma';
import { requireCoach } from '@/lib/coach-auth';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

const publicCoachSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  photo: true,
  bio: true,
  certifications: true,
  specialties: true,
  languages: true,
  focusLevels: true,
  groupSizes: true,
  experienceBand: true,
  yearsExperience: true,
  responseHint: true,
  ratingOverall: true,
  ratingOnTime: true,
  ratingFriendly: true,
  ratingProfessional: true,
  ratingRecommend: true,
  reviewCount: true,
  isActive: true,
  isProfilePublic: true,
  hourlyRate1on1: true,
  hourlyRateGroup: true,
  maxGroupSize: true,
  cancellationHours: true,
  creditExpiryDays: true,
  courtLinks: {
    where: { isActive: true },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
        },
      },
    },
  },
  creditPacks: {
    where: { isActive: true },
    orderBy: { price: 'asc' as const },
  },
  reviews: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
  },
} satisfies Prisma.CoachSelect;

const patchableKeys = new Set([
  'name',
  'email',
  'photo',
  'bio',
  'certifications',
  'specialties',
  'languages',
  'focusLevels',
  'groupSizes',
  'experienceBand',
  'yearsExperience',
  'responseHint',
  'hourlyRate1on1',
  'hourlyRateGroup',
  'maxGroupSize',
  'cancellationHours',
  'creditExpiryDays',
  'bankName',
  'bankAccountName',
  'bankAccountNumber',
  'bankBin',
  'isProfilePublic',
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const coach = await prisma.coach.findUnique({
      where: { id },
      select: publicCoachSelect,
    });

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    return NextResponse.json({ coach });
  } catch (err) {
    console.error('GET /api/coaches/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
    }

    const raw = body as Record<string, unknown>;
    const data: Prisma.CoachUpdateInput = {};

    for (const key of patchableKeys) {
      if (!(key in raw)) continue;
      const v = raw[key];

      switch (key) {
        case 'name':
        case 'photo':
        case 'bio':
        case 'bankName':
        case 'bankAccountName':
        case 'bankAccountNumber':
        case 'bankBin':
          if (v !== null && typeof v !== 'string') {
            return NextResponse.json({ error: `${key} must be a string` }, { status: 400 });
          }
          (data as Record<string, unknown>)[key] = v;
          break;
        case 'email':
          if (v !== null && typeof v !== 'string') {
            return NextResponse.json({ error: 'email must be a string' }, { status: 400 });
          }
          (data as Record<string, unknown>)[key] = v;
          break;
        case 'certifications':
        case 'specialties':
        case 'languages':
        case 'focusLevels':
        case 'groupSizes':
          if (!Array.isArray(v) || !v.every((item) => typeof item === 'string')) {
            return NextResponse.json({ error: `${key} must be an array of strings` }, { status: 400 });
          }
          (data as Record<string, unknown>)[key] = v;
          break;
        case 'experienceBand':
          if (v !== null && typeof v !== 'string') {
            return NextResponse.json({ error: 'experienceBand must be a string or null' }, { status: 400 });
          }
          data.experienceBand = v;
          break;
        case 'responseHint':
          if (v !== null && typeof v !== 'string') {
            return NextResponse.json({ error: 'responseHint must be a string or null' }, { status: 400 });
          }
          data.responseHint = v;
          break;
        case 'yearsExperience':
          if (v === null) {
            data.yearsExperience = null;
            break;
          }
          if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
            return NextResponse.json({ error: 'yearsExperience must be a non-negative integer or null' }, { status: 400 });
          }
          data.yearsExperience = v;
          break;
        case 'hourlyRateGroup':
          if (v === null) {
            data.hourlyRateGroup = null;
            break;
          }
          if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
            return NextResponse.json({ error: 'hourlyRateGroup must be a non-negative integer or null' }, { status: 400 });
          }
          data.hourlyRateGroup = v;
          break;
        case 'hourlyRate1on1':
        case 'maxGroupSize':
        case 'cancellationHours':
        case 'creditExpiryDays':
          if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
            return NextResponse.json({ error: `${key} must be a non-negative integer` }, { status: 400 });
          }
          (data as Record<string, unknown>)[key] = v;
          break;
        case 'isProfilePublic':
          if (typeof v !== 'boolean') {
            return NextResponse.json({ error: 'isProfilePublic must be a boolean' }, { status: 400 });
          }
          data.isProfilePublic = v;
          break;
        default:
          break;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (typeof data.email === 'string' && data.email.length > 0) {
      const existing = await prisma.coach.findFirst({
        where: { email: data.email, NOT: { id } },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    const updated = await prisma.coach.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photo: true,
        bio: true,
        certifications: true,
        specialties: true,
        languages: true,
        focusLevels: true,
        groupSizes: true,
        experienceBand: true,
        yearsExperience: true,
        responseHint: true,
        ratingOverall: true,
        reviewCount: true,
        isProfilePublic: true,
        hourlyRate1on1: true,
        hourlyRateGroup: true,
        maxGroupSize: true,
        cancellationHours: true,
        creditExpiryDays: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankBin: true,
      },
    });

    return NextResponse.json({ coach: updated });
  } catch (err) {
    console.error('PATCH /api/coaches/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
