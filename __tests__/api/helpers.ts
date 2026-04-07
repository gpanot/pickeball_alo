import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

// Create a NextRequest pointing at our API
export function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): NextRequest {
  const fullUrl = `http://localhost:3000${url}`;
  const opts: RequestInit = { method: init?.method ?? 'GET' };
  if (init?.body) {
    opts.body = JSON.stringify(init.body);
    opts.headers = { 'Content-Type': 'application/json', ...init?.headers };
  }
  if (init?.headers && !opts.headers) {
    opts.headers = init.headers;
  }
  return new NextRequest(fullUrl, opts);
}

// Parse a NextResponse into { status, data }
export async function parseResponse(res: Response) {
  const status = res.status;
  const data = await res.json().catch(() => null);
  return { status, data };
}

const PASSWORD_HASH = bcrypt.hashSync('testpass123', 4);

export async function createTestCoach(overrides: Record<string, unknown> = {}) {
  const phone = `09${Date.now().toString().slice(-8)}`;
  return prisma.coach.create({
    data: {
      name: 'Test Coach',
      phone,
      passwordHash: PASSWORD_HASH,
      phoneVerified: true,
      hourlyRate1on1: 200000,
      specialties: ['Pickleball'],
      subscriptionPlan: 'trial',
      trialBookingsUsed: 0,
      ...overrides,
    },
  });
}

export async function createTestVenueWithCourt() {
  const venue = await prisma.venue.create({
    data: {
      name: 'Test Venue',
      address: '123 Test St',
      lat: 10.79,
      lng: 106.71,
    },
  });
  const court = await prisma.court.create({
    data: {
      venueId: venue.id,
      name: 'Court 1',
    },
  });
  return { venue, court };
}

export async function linkCoachToVenue(coachId: string, venueId: string, courtIds: string[]) {
  return prisma.coachCourtLink.create({
    data: { coachId, venueId, courtIds, isActive: true },
  });
}

export async function addAvailability(coachId: string, venueId: string, overrides: Record<string, unknown> = {}) {
  return prisma.coachAvailability.create({
    data: {
      coachId,
      venueId,
      startTime: '06:00',
      endTime: '22:00',
      dayOfWeek: null,
      date: null,
      isBlocked: false,
      ...overrides,
    },
  });
}

export async function createCreditPack(coachId: string, overrides: Record<string, unknown> = {}) {
  return prisma.creditPack.create({
    data: {
      coachId,
      name: '5-session pack',
      creditCount: 5,
      price: 900000,
      isActive: true,
      ...overrides,
    },
  });
}

export function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function futureDateDow(daysAhead: number): number {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.getDay();
}

export async function cleanupTestData() {
  await prisma.coachReview.deleteMany({});
  await prisma.sessionParticipant.deleteMany({});
  await prisma.coachSession.deleteMany({});
  await prisma.credit.deleteMany({});
  await prisma.creditPack.deleteMany({});
  await prisma.coachAvailability.deleteMany({});
  await prisma.coachCourtLink.deleteMany({});
  await prisma.coachVenueInvite.deleteMany({});
  await prisma.coach.deleteMany({});
  // Only delete test venues (not seeded ones)
  await prisma.court.deleteMany({ where: { venue: { name: 'Test Venue' } } });
  await prisma.venue.deleteMany({ where: { name: 'Test Venue' } });
}
