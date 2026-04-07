/**
 * Phase 1 — Auth and coach profiles
 */
import {
  prisma,
  makeRequest,
  parseResponse,
  createTestCoach,
  createTestVenueWithCourt,
  linkCoachToVenue,
  addAvailability,
  futureDate,
  futureDateDow,
  cleanupTestData,
} from './helpers';
import { GET as coachSearchGET } from '@/app/api/coaches/route';
import { POST as registerPOST } from '@/app/api/coaches/register/route';
import { POST as sessionPOST } from '@/app/api/sessions/route';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData();
});

describe('Phase 1 — Auth and coach profiles', () => {
  describe('Coach registration', () => {
    it('registers a new coach with phoneVerified=false by default', async () => {
      const req = makeRequest('/api/coaches/register', {
        method: 'POST',
        body: {
          name: 'New Coach',
          phone: '0900000001',
          password: 'secret123',
          hourlyRate1on1: 300000,
        },
      });
      const res = await registerPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.token).toBeDefined();
      expect(data.coach.name).toBe('New Coach');

      // Verify phoneVerified is false in DB
      const coach = await prisma.coach.findUnique({ where: { phone: '0900000001' } });
      expect(coach!.phoneVerified).toBe(false);
    });
  });

  describe('Coach not visible in search if phoneVerified=false', () => {
    it('excludes unverified coaches from search results', async () => {
      await createTestCoach({ name: 'Unverified Coach', phoneVerified: false });
      await createTestCoach({ name: 'Verified Coach', phoneVerified: true });

      const req = makeRequest('/api/coaches');
      const res = await coachSearchGET(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      const names = data.coaches.map((c: { name: string }) => c.name);
      expect(names).not.toContain('Unverified Coach');
      expect(names).toContain('Verified Coach');
    });
  });

  describe('Player booking blocked if coach phoneVerified=false', () => {
    it('rejects session creation for unverified coach', async () => {
      const coach = await createTestCoach({ phoneVerified: false });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '08:00', endTime: '20:00' });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'player1',
          userName: 'Test Player',
          userPhone: '0912345678',
        },
      });

      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.error).toMatch(/phone not verified/i);
    });
  });

  describe('Coach subscription — trial limit', () => {
    it('allows booking when trial has < 10 bookings used', async () => {
      const coach = await createTestCoach({ trialBookingsUsed: 9 });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'player1',
          userName: 'Test Player',
          userPhone: '0912345678',
        },
      });

      const res = await sessionPOST(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(201);
    });

    it('rejects the 11th booking on trial plan', async () => {
      const coach = await createTestCoach({ trialBookingsUsed: 10 });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'player1',
          userName: 'Test Player',
          userPhone: '0912345678',
        },
      });

      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.error).toMatch(/trial limit/i);
    });

    it('allows unlimited bookings on standard plan', async () => {
      const coach = await createTestCoach({
        subscriptionPlan: 'standard',
        subscriptionExpires: new Date(Date.now() + 30 * 86400000),
        trialBookingsUsed: 100,
      });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'player1',
          userName: 'Test Player',
          userPhone: '0912345678',
        },
      });

      const res = await sessionPOST(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(201);
    });
  });

  describe('Coach profile not visible if subscription lapsed', () => {
    it('excludes coaches with expired standard subscription from search', async () => {
      await createTestCoach({
        name: 'Expired Coach',
        subscriptionPlan: 'standard',
        subscriptionExpires: new Date(Date.now() - 86400000),
      });
      await createTestCoach({
        name: 'Active Coach',
        subscriptionPlan: 'standard',
        subscriptionExpires: new Date(Date.now() + 30 * 86400000),
      });

      const req = makeRequest('/api/coaches');
      const res = await coachSearchGET(req);
      const { data } = await parseResponse(res);

      const names = data.coaches.map((c: { name: string }) => c.name);
      expect(names).not.toContain('Expired Coach');
      expect(names).toContain('Active Coach');
    });
  });
});
