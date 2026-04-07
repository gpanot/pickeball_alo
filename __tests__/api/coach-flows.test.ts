/**
 * Coach flow integration tests — covers login, profile update, courts,
 * availability, session lifecycle, flag payment, and subscription.
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
import { signCoachToken } from '@/lib/coach-session';

import { POST as registerPOST } from '@/app/api/coaches/register/route';
import { POST as loginPOST } from '@/app/api/coaches/login/route';
import { GET as coachGET, PATCH as coachPATCH } from '@/app/api/coaches/[id]/route';
import {
  GET as courtsGET,
  POST as courtsPOST,
  DELETE as courtsDELETE,
} from '@/app/api/coaches/[id]/courts/route';
import {
  GET as availGET,
  PUT as availPUT,
} from '@/app/api/coaches/[id]/availability/route';
import { GET as subsGET } from '@/app/api/coaches/[id]/subscription/route';
import { POST as sessionPOST } from '@/app/api/sessions/route';
import { GET as sessionGET, PATCH as sessionPATCH } from '@/app/api/sessions/[id]/route';
import { PATCH as paymentPATCH } from '@/app/api/sessions/[id]/payment/route';
import { POST as flagPOST } from '@/app/api/sessions/[id]/flag-payment/route';

function coachReq(url: string, coachId: string, phone: string, opts?: { method?: string; body?: unknown }) {
  const token = signCoachToken(coachId, phone, 'trial');
  return makeRequest(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}` },
  });
}

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Coach flows', () => {
  // ── Register + Login ──────────────────────────────────────────────
  describe('Register and Login', () => {
    const phone = `09${Date.now().toString().slice(-8)}`;

    it('registers a new coach and returns token + coach', async () => {
      const req = makeRequest('/api/coaches/register', {
        method: 'POST',
        body: {
          name: 'Flow Coach',
          phone,
          password: 'testpass123',
          hourlyRate1on1: 300000,
          specialties: ['Tennis'],
        },
      });
      const res = await registerPOST(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.token).toBeTruthy();
      expect(data.coach.id).toBeTruthy();
      expect(data.coach.name).toBe('Flow Coach');
      expect(data.coach.phone).toBe(phone);
    });

    it('logs in with the same credentials', async () => {
      const req = makeRequest('/api/coaches/login', {
        method: 'POST',
        body: { phone, password: 'testpass123' },
      });
      const res = await loginPOST(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.token).toBeTruthy();
      expect(data.coach.phone).toBe(phone);
      expect(data.coach.subscriptionPlan).toBe('trial');
    });

    it('rejects login with wrong password', async () => {
      const req = makeRequest('/api/coaches/login', {
        method: 'POST',
        body: { phone, password: 'wrongpass' },
      });
      const res = await loginPOST(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(401);
    });
  });

  // ── Profile GET + PATCH ───────────────────────────────────────────
  describe('Coach profile', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Profile Coach' });
    });

    it('GET /api/coaches/[id] returns { coach } envelope', async () => {
      const req = makeRequest(`/api/coaches/${coach.id}`);
      const res = await coachGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach).toBeDefined();
      expect(data.coach.id).toBe(coach.id);
      expect(data.coach.name).toBe('Profile Coach');
    });

    it('PATCH /api/coaches/[id] updates bio and bank details', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: { bio: 'Updated bio', bankName: 'VCB', bankAccountNumber: '123456' },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach).toBeDefined();
      expect(data.coach.bio).toBe('Updated bio');
      expect(data.coach.bankName).toBe('VCB');
    });
  });

  // ── Court Partnership ─────────────────────────────────────────────
  describe('Court partnerships', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };
    let court: { id: string };

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Court Coach' });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
      court = vc.court;
    });

    it('POST adds a court partnership', async () => {
      const req = coachReq(`/api/coaches/${coach.id}/courts`, coach.id, coach.phone, {
        method: 'POST',
        body: { venueId: venue.id, courtIds: [court.id] },
      });
      const res = await courtsPOST(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.venueId).toBe(venue.id);
    });

    it('GET lists court partnerships', async () => {
      const req = makeRequest(`/api/coaches/${coach.id}/courts`);
      const res = await courtsGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].venueId).toBe(venue.id);
    });

    it('DELETE removes a court partnership', async () => {
      const req = coachReq(
        `/api/coaches/${coach.id}/courts?venueId=${encodeURIComponent(venue.id)}`,
        coach.id,
        coach.phone,
        { method: 'DELETE' },
      );
      const res = await courtsDELETE(req, { params: Promise.resolve({ id: coach.id }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(200);

      // Verify empty
      const listReq = makeRequest(`/api/coaches/${coach.id}/courts`);
      const listRes = await courtsGET(listReq, { params: Promise.resolve({ id: coach.id }) });
      const { data: courts } = await parseResponse(listRes);
      expect(courts.length).toBe(0);
    });
  });

  // ── Availability CRUD ─────────────────────────────────────────────
  describe('Availability', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Avail Coach' });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
    });

    it('PUT sets availability slots', async () => {
      const req = coachReq(`/api/coaches/${coach.id}/availability`, coach.id, coach.phone, {
        method: 'PUT',
        body: {
          availability: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', venueId: venue.id, date: null, isBlocked: false },
            { dayOfWeek: 3, startTime: '14:00', endTime: '18:00', venueId: venue.id, date: null, isBlocked: false },
          ],
        },
      });
      const res = await availPUT(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('GET retrieves all availability', async () => {
      const req = makeRequest(`/api/coaches/${coach.id}/availability`);
      const res = await availGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0].startTime).toBeTruthy();
    });
  });

  // ── Session Lifecycle (coach-side) ────────────────────────────────
  describe('Session lifecycle', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };
    let court: { id: string };
    let sessionId: string;
    const date = futureDate(3);
    const dow = futureDateDow(3);

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Lifecycle Coach' });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
      court = vc.court;
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow });
    });

    it('player books a session', async () => {
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
          userPhone: '0900000001',
        },
      });
      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.status).toBe('confirmed');
      expect(data.coachId).toBe(coach.id);
      sessionId = data.id;
    });

    it('GET session returns status field', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}`);
      const res = await sessionGET(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.status).toBe('confirmed');
      expect(data.paymentStatus).toBe('pending');
    });

    it('coach marks session as completed', async () => {
      const req = coachReq(`/api/sessions/${sessionId}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: { status: 'completed' },
      });
      const res = await sessionPATCH(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.status).toBe('completed');
    });
  });

  // ── Flag Payment ──────────────────────────────────────────────────
  describe('Flag payment', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };
    let court: { id: string };
    let sessionId: string;
    const date = futureDate(5);
    const dow = futureDateDow(5);

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Flag Coach' });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
      court = vc.court;
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '14:00',
          endTime: '15:00',
          sessionType: '1on1',
          userId: 'player2',
          userName: 'Flag Player',
          userPhone: '0900000002',
        },
      });
      const res = await sessionPOST(req);
      const { data } = await parseResponse(res);
      sessionId = data.id;
    });

    it('submits payment proof then coach flags payment', async () => {
      // Player submits payment
      const payReq = makeRequest(`/api/sessions/${sessionId}/payment`, {
        method: 'PATCH',
        body: {
          userId: 'player2',
          paymentProofUrl: 'https://example.com/proof.jpg',
        },
      });
      const payRes = await paymentPATCH(payReq, { params: Promise.resolve({ id: sessionId }) });
      const { status: payStatus, data: payData } = await parseResponse(payRes);
      expect(payStatus).toBe(200);
      expect(payData.paymentStatus).toBe('payment_submitted');

      // Coach flags payment not received
      const req = coachReq(`/api/sessions/${sessionId}/flag-payment`, coach.id, coach.phone, {
        method: 'POST',
      });
      const res = await flagPOST(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.paymentFlaggedAt).toBeTruthy();
    });
  });

  // ── Subscription ──────────────────────────────────────────────────
  describe('Subscription', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Sub Coach' });
    });

    it('GET subscription shows trial plan', async () => {
      const req = coachReq(`/api/coaches/${coach.id}/subscription`, coach.id, coach.phone);
      const res = await subsGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.plan).toBe('trial');
      expect(data.trialBookingsUsed).toBe(0);
      expect(data.isExpired).toBe(false);
    });
  });
});
