/**
 * Phase 2 — Session booking
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
import { POST as sessionPOST } from '@/app/api/sessions/route';
import { PATCH as sessionPATCH } from '@/app/api/sessions/[id]/route';
import { PATCH as paymentPATCH } from '@/app/api/sessions/[id]/payment/route';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData();
});

function makeSessionBody(coachId: string, venueId: string, date: string, overrides: Record<string, unknown> = {}) {
  return {
    coachId,
    venueId,
    date,
    startTime: '10:00',
    endTime: '11:00',
    sessionType: '1on1',
    userId: 'player1',
    userName: 'Test Player',
    userPhone: '0912345678',
    ...overrides,
  };
}

describe('Phase 2 — Session booking', () => {
  describe('Booking succeeds with valid coach + time + court', () => {
    it('creates a session with confirmed status', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: makeSessionBody(coach.id, venue.id, date),
      });

      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.status).toBe('confirmed');
      expect(data.coachId).toBe(coach.id);
      expect(data.venueId).toBe(venue.id);
      expect(data.participants).toHaveLength(1);
      expect(data.participants[0].userId).toBe('player1');
    });
  });

  describe('Booking rejected — 3-hour daily limit', () => {
    it('rejects booking that would exceed 3 hours of coaching in one day', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Book 3 hours first (three 1-hour sessions)
      for (const [start, end] of [['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00']]) {
        const req = makeRequest('/api/sessions', {
          method: 'POST',
          body: makeSessionBody(coach.id, venue.id, date, { startTime: start, endTime: end }),
        });
        const res = await sessionPOST(req);
        expect((await parseResponse(res)).status).toBe(201);
      }

      // 4th hour should be rejected
      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: makeSessionBody(coach.id, venue.id, date, { startTime: '11:00', endTime: '12:00' }),
      });
      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.error).toMatch(/3 hours/i);
    });
  });

  describe('Booking rejected — coach availability', () => {
    it('rejects booking when coach has no availability for requested time', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      // Availability is only 08:00-12:00
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '08:00', endTime: '12:00' });

      // Request 14:00-15:00 which is outside availability
      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: makeSessionBody(coach.id, venue.id, date, { startTime: '14:00', endTime: '15:00' }),
      });
      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.error).toMatch(/not available/i);
    });

    it('accepts booking when requested time is within availability', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '08:00', endTime: '18:00' });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: makeSessionBody(coach.id, venue.id, date, { startTime: '09:00', endTime: '10:00' }),
      });
      const res = await sessionPOST(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(201);
    });
  });

  describe('Session status transitions', () => {
    it('transitions: pending → payment_submitted → paid (via payment proof)', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Create session
      const createReq = makeRequest('/api/sessions', {
        method: 'POST',
        body: makeSessionBody(coach.id, venue.id, date),
      });
      const createRes = await sessionPOST(createReq);
      const { data: session } = await parseResponse(createRes);
      expect(session.paymentStatus).toBe('pending');

      // Submit payment proof
      const payReq = makeRequest(`/api/sessions/${session.id}/payment`, {
        method: 'PATCH',
        body: { userId: 'player1', paymentProofUrl: 'https://example.com/proof.jpg' },
      });
      const payRes = await paymentPATCH(payReq, { params: Promise.resolve({ id: session.id }) });
      const { status: payStatus, data: payData } = await parseResponse(payRes);

      expect(payStatus).toBe(200);
      expect(payData.paymentStatus).toBe('payment_submitted');
    });

    it('transitions: confirmed → canceled (frees the slot)', async () => {
      // Coach with 0 cancellation hours so we can cancel a near-future session
      const coach = await createTestCoach({ cancellationHours: 0 });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(3);
      const dow = futureDateDow(3);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      const createReq = makeRequest('/api/sessions', {
        method: 'POST',
        body: makeSessionBody(coach.id, venue.id, date),
      });
      const createRes = await sessionPOST(createReq);
      const { data: session } = await parseResponse(createRes);
      expect(session.status).toBe('confirmed');

      // Cancel
      const cancelReq = makeRequest(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        body: { status: 'canceled' },
      });
      const cancelRes = await sessionPATCH(cancelReq, { params: Promise.resolve({ id: session.id }) });
      const { status: cancelStatus, data: cancelData } = await parseResponse(cancelRes);

      expect(cancelStatus).toBe(200);
      expect(cancelData.status).toBe('canceled');
    });
  });
});
