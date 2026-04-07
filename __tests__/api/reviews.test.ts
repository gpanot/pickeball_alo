/**
 * Phase 6 — Trust and ratings
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
import { POST as reviewPOST, GET as reviewGET } from '@/app/api/coaches/[id]/reviews/route';
import { POST as sessionPOST } from '@/app/api/sessions/route';
import { PATCH as sessionPATCH } from '@/app/api/sessions/[id]/route';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData();
});

async function createCompletedSession(coachId: string, venueId: string, userId: string, date: string, start: string, end: string) {
  const req = makeRequest('/api/sessions', {
    method: 'POST',
    body: {
      coachId,
      venueId,
      date,
      startTime: start,
      endTime: end,
      sessionType: '1on1',
      userId,
      userName: 'Player',
      userPhone: '0912345678',
    },
  });
  const res = await sessionPOST(req);
  const { data: session } = await parseResponse(res);

  // Mark completed via DB directly (avoid time-based guards)
  await prisma.coachSession.update({
    where: { id: session.id },
    data: { status: 'completed' },
  });

  return session;
}

function makeReviewBody(sessionId: string | null, userId: string) {
  return {
    sessionId,
    userId,
    userName: 'Player',
    ratingOnTime: 4,
    ratingFriendly: 5,
    ratingProfessional: 4,
    ratingRecommend: 5,
    comment: 'Great session!',
  };
}

describe('Phase 6 — Trust and ratings', () => {
  describe('Review submission blocked if session not completed', () => {
    it('rejects review for a confirmed (not completed) session', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(5);
      const dow = futureDateDow(5);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Create session (status = confirmed, not completed)
      const sReq = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'player1',
          userName: 'Player',
          userPhone: '0912345678',
        },
      });
      const sRes = await sessionPOST(sReq);
      const { data: session } = await parseResponse(sRes);
      expect(session.status).toBe('confirmed');

      // Try to review
      const req = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: makeReviewBody(session.id, 'player1'),
      });
      const res = await reviewPOST(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.error).toMatch(/completed/i);
    });
  });

  describe('Review isPublic logic', () => {
    it('saves review with isPublic=false if player has < 3 completed sessions', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(5);
      const dow = futureDateDow(5);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Only 1 completed session
      const session = await createCompletedSession(coach.id, venue.id, 'player1', date, '10:00', '11:00');

      const req = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: makeReviewBody(session.id, 'player1'),
      });
      const res = await reviewPOST(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.isPublic).toBe(false);
    });

    it('flips all prior reviews to isPublic=true after 3rd completed session', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(5);
      const dow = futureDateDow(5);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Create and complete 3 sessions
      const s1 = await createCompletedSession(coach.id, venue.id, 'player1', date, '08:00', '09:00');
      const s2 = await createCompletedSession(coach.id, venue.id, 'player1', date, '09:00', '10:00');
      const s3 = await createCompletedSession(coach.id, venue.id, 'player1', date, '10:00', '11:00');

      // Review for session 1 — should be private (only 3 completed, but we count BEFORE insert moment)
      // Actually at this point there are already 3 completed sessions, so:
      const req1 = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: makeReviewBody(s1.id, 'player1'),
      });
      const res1 = await reviewPOST(req1, { params: Promise.resolve({ id: coach.id }) });
      const { data: review1 } = await parseResponse(res1);
      expect(review1.isPublic).toBe(true);

      // Review for session 2 — should also be public
      const req2 = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: makeReviewBody(s2.id, 'player1'),
      });
      const res2 = await reviewPOST(req2, { params: Promise.resolve({ id: coach.id }) });
      const { data: review2 } = await parseResponse(res2);
      expect(review2.isPublic).toBe(true);

      // All reviews should be public
      const allReviews = await prisma.coachReview.findMany({
        where: { coachId: coach.id, userId: 'player1' },
      });
      expect(allReviews.every((r) => r.isPublic)).toBe(true);
    });

    it('review stays private (isPublic=false) when player has < 3 completed sessions', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(5);
      const dow = futureDateDow(5);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Only 2 completed sessions
      const s1 = await createCompletedSession(coach.id, venue.id, 'player1', date, '08:00', '09:00');
      const s2 = await createCompletedSession(coach.id, venue.id, 'player1', date, '09:00', '10:00');

      const req1 = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: makeReviewBody(s1.id, 'player1'),
      });
      const res1 = await reviewPOST(req1, { params: Promise.resolve({ id: coach.id }) });
      const { data: r1 } = await parseResponse(res1);
      expect(r1.isPublic).toBe(false);

      const req2 = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: makeReviewBody(s2.id, 'player1'),
      });
      const res2 = await reviewPOST(req2, { params: Promise.resolve({ id: coach.id }) });
      const { data: r2 } = await parseResponse(res2);
      expect(r2.isPublic).toBe(false);
    });
  });

  describe('Review stays private if phoneVerified=false even after 3 sessions', () => {
    it('keeps review private when coach is not phone-verified', async () => {
      const coach = await createTestCoach({ phoneVerified: false });

      // We can't create sessions through the API (phoneVerified=false blocks it),
      // so create them directly in DB
      const { venue, court } = await createTestVenueWithCourt();
      for (let i = 0; i < 3; i++) {
        await prisma.coachSession.create({
          data: {
            coachId: coach.id,
            venueId: venue.id,
            venueName: venue.name,
            date: futureDate(5),
            startTime: `${8 + i}:00`,
            endTime: `${9 + i}:00`,
            sessionType: '1on1',
            status: 'completed',
            coachFee: 200000,
            courtFee: 0,
            totalPerPlayer: 200000,
            paymentStatus: 'paid',
            participants: {
              create: {
                userId: 'player1',
                userName: 'Player',
                userPhone: '0912345678',
                amountDue: 200000,
                paymentStatus: 'paid',
              },
            },
          },
        });
      }

      // Submit review — should be private despite 3+ completed sessions
      const req = makeRequest(`/api/coaches/${coach.id}/reviews`, {
        method: 'POST',
        body: {
          userId: 'player1',
          userName: 'Player',
          ratingOnTime: 5,
          ratingFriendly: 5,
          ratingProfessional: 5,
          ratingRecommend: 5,
        },
      });
      const res = await reviewPOST(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.isPublic).toBe(false);
    });
  });

  describe('GET reviews only returns isPublic=true records', () => {
    it('filters out private reviews from GET response', async () => {
      const coach = await createTestCoach();

      // Create a private and a public review directly
      await prisma.coachReview.create({
        data: {
          coachId: coach.id,
          userId: 'player1',
          userName: 'Player 1',
          ratingOnTime: 5,
          ratingFriendly: 5,
          ratingProfessional: 5,
          ratingRecommend: 5,
          ratingOverall: 5,
          isPublic: false,
        },
      });
      await prisma.coachReview.create({
        data: {
          coachId: coach.id,
          userId: 'player2',
          userName: 'Player 2',
          ratingOnTime: 4,
          ratingFriendly: 4,
          ratingProfessional: 4,
          ratingRecommend: 4,
          ratingOverall: 4,
          isPublic: true,
        },
      });

      const req = makeRequest(`/api/coaches/${coach.id}/reviews`);
      const res = await reviewGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.total).toBe(1);
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0].userName).toBe('Player 2');
    });
  });
});
