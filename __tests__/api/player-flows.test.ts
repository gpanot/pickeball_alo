/**
 * Player flow integration tests — covers the full player-facing API surface:
 * join/leave group sessions, credit purchase, credit list, session list,
 * and end-to-end payment proof submission.
 */
import {
  prisma,
  makeRequest,
  parseResponse,
  createTestCoach,
  createTestVenueWithCourt,
  linkCoachToVenue,
  addAvailability,
  createCreditPack,
  futureDate,
  futureDateDow,
  cleanupTestData,
} from './helpers';
import { signCoachToken } from '@/lib/coach-session';

import { POST as sessionPOST, GET as sessionsGET } from '@/app/api/sessions/route';
import { GET as sessionGET, PATCH as sessionPATCH } from '@/app/api/sessions/[id]/route';
import { POST as joinPOST } from '@/app/api/sessions/[id]/join/route';
import { DELETE as leaveDELETE } from '@/app/api/sessions/[id]/leave/route';
import { PATCH as paymentPATCH } from '@/app/api/sessions/[id]/payment/route';
import { GET as creditsGET, POST as creditsPOST } from '@/app/api/credits/route';
import { GET as creditGET, PATCH as creditPATCH } from '@/app/api/credits/[id]/route';

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

function coachReq(url: string, coachId: string, phone: string, opts?: { method?: string; body?: unknown }) {
  const token = signCoachToken(coachId, phone, 'trial');
  return makeRequest(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('Player flows', () => {
  // ── Group Session: Join and Leave ─────────────────────────────────
  describe('Group session join / leave', () => {
    let sessionId: string;
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };
    let court: { id: string };
    const date = futureDate(4);
    const dow = futureDateDow(4);

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Group Coach', maxGroupSize: 4 });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
      court = vc.court;
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow });

      // Player 1 creates a group session
      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '09:00',
          endTime: '10:00',
          sessionType: 'group',
          userId: 'player-a',
          userName: 'Player A',
          userPhone: '0900000010',
        },
      });
      const res = await sessionPOST(req);
      const { data } = await parseResponse(res);
      sessionId = data.id;
    });

    it('player B joins the group session', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        body: { userId: 'player-b', userName: 'Player B', userPhone: '0900000011' },
      });
      const res = await joinPOST(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.participants.length).toBe(2);
      expect(data.participants.some((p: any) => p.userId === 'player-b')).toBe(true);
    });

    it('rejects duplicate join', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        body: { userId: 'player-b', userName: 'Player B', userPhone: '0900000011' },
      });
      const res = await joinPOST(req, { params: Promise.resolve({ id: sessionId }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('player B leaves the group session', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/leave?userId=player-b`, {
        method: 'DELETE',
      });
      const res = await leaveDELETE(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.participants.length).toBe(1);
      expect(data.participants.some((p: any) => p.userId === 'player-b')).toBe(false);
    });

    it('rejects leave for non-member', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/leave?userId=nobody`, {
        method: 'DELETE',
      });
      const res = await leaveDELETE(req, { params: Promise.resolve({ id: sessionId }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('cancels session if last participant leaves', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/leave?userId=player-a`, {
        method: 'DELETE',
      });
      const res = await leaveDELETE(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.status).toBe('canceled');
    });
  });

  // ── Session list by userId ────────────────────────────────────────
  describe('Session listing', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };
    let court: { id: string };
    const date = futureDate(6);
    const dow = futureDateDow(6);

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'List Coach' });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
      court = vc.court;
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow });

      // Create 2 sessions for the same player
      for (const [start, end] of [['08:00', '09:00'], ['10:00', '11:00']]) {
        const req = makeRequest('/api/sessions', {
          method: 'POST',
          body: {
            coachId: coach.id,
            venueId: venue.id,
            date,
            startTime: start,
            endTime: end,
            sessionType: '1on1',
            userId: 'list-player',
            userName: 'List Player',
            userPhone: '0900000020',
          },
        });
        await sessionPOST(req);
      }
    });

    it('GET /api/sessions?userId returns player sessions', async () => {
      const req = makeRequest('/api/sessions?userId=list-player');
      const res = await sessionsGET(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0].participants[0].userId).toBe('list-player');
    });
  });

  // ── Credit Purchase + List ────────────────────────────────────────
  describe('Credits', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let packId: string;
    let creditId: string;

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Credit Coach' });
      const pack = await createCreditPack(coach.id, { name: '5-session pack', creditCount: 5, price: 900000 });
      packId = pack.id;
    });

    it('POST /api/credits purchases a credit pack', async () => {
      const req = makeRequest('/api/credits', {
        method: 'POST',
        body: {
          coachId: coach.id,
          userId: 'credit-player',
          userName: 'Credit Player',
          userPhone: '0900000030',
          creditPackId: packId,
        },
      });
      const res = await creditsPOST(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.totalCredits).toBe(5);
      expect(data.remainingCredits).toBe(5);
      expect(data.paymentStatus).toBe('pending');
      creditId = data.id;
    });

    it('GET /api/credits lists credits for userId', async () => {
      const req = makeRequest('/api/credits?userId=credit-player');
      const res = await creditsGET(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].coachId).toBe(coach.id);
    });

    it('GET /api/credits/[id] returns credit detail', async () => {
      const req = makeRequest(`/api/credits/${creditId}`);
      const res = await creditGET(req, { params: Promise.resolve({ id: creditId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.id).toBe(creditId);
      expect(data.totalCredits).toBe(5);
    });

    it('PATCH /api/credits/[id] confirms credit (coach auth)', async () => {
      const req = coachReq(`/api/credits/${creditId}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: { action: 'confirm' },
      });
      const res = await creditPATCH(req, { params: Promise.resolve({ id: creditId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.paymentStatus).toBe('confirmed');
    });
  });

  // ── Payment Proof Submission ──────────────────────────────────────
  describe('Payment proof', () => {
    let sessionId: string;

    beforeAll(async () => {
      const coach = await createTestCoach({ name: 'Pay Coach' });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(7);
      const dow = futureDateDow(7);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow });

      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '15:00',
          endTime: '16:00',
          sessionType: '1on1',
          userId: 'pay-player',
          userName: 'Pay Player',
          userPhone: '0900000040',
        },
      });
      const res = await sessionPOST(req);
      const { data } = await parseResponse(res);
      sessionId = data.id;
    });

    it('player submits payment proof', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/payment`, {
        method: 'PATCH',
        body: { userId: 'pay-player', paymentProofUrl: 'https://proof.example.com/img.png' },
      });
      const res = await paymentPATCH(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.paymentStatus).toBe('payment_submitted');
      const participant = data.participants.find((p: any) => p.userId === 'pay-player');
      expect(participant.paymentProofUrl).toBe('https://proof.example.com/img.png');
      expect(participant.paidAt).toBeTruthy();
    });

    it('GET session reflects updated payment status', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}`);
      const res = await sessionGET(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.paymentStatus).toBe('payment_submitted');
    });
  });
});
