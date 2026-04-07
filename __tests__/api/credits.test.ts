/**
 * Phase 3 — Credits
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
import { POST as creditsPOST, GET as creditsGET } from '@/app/api/credits/route';
import { POST as sessionPOST } from '@/app/api/sessions/route';
import { PATCH as sessionPATCH } from '@/app/api/sessions/[id]/route';

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData();
});

async function setupCoachWithCredits(userId: string) {
  const coach = await createTestCoach();
  const { venue, court } = await createTestVenueWithCourt();
  await linkCoachToVenue(coach.id, venue.id, [court.id]);
  const date = futureDate(5);
  const dow = futureDateDow(5);
  await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });
  const pack = await createCreditPack(coach.id);

  // Purchase credits
  const purchaseReq = makeRequest('/api/credits', {
    method: 'POST',
    body: {
      coachId: coach.id,
      userId,
      userName: 'Player',
      userPhone: '0912345678',
      creditPackId: pack.id,
    },
  });
  const purchaseRes = await creditsPOST(purchaseReq);
  const { data: credit } = await parseResponse(purchaseRes);

  // Confirm payment (directly in DB for test simplicity)
  await prisma.credit.update({
    where: { id: credit.id },
    data: { paymentStatus: 'confirmed' },
  });

  return { coach, venue, court, pack, credit, date };
}

describe('Phase 3 — Credits', () => {
  describe('Credit balance correct after purchase', () => {
    it('creates credit record with correct balance', async () => {
      const coach = await createTestCoach();
      const pack = await createCreditPack(coach.id, { creditCount: 5, price: 900000 });

      const req = makeRequest('/api/credits', {
        method: 'POST',
        body: {
          coachId: coach.id,
          userId: 'player1',
          userName: 'Player',
          userPhone: '0912345678',
          creditPackId: pack.id,
        },
      });
      const res = await creditsPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.totalCredits).toBe(5);
      expect(data.remainingCredits).toBe(5);
      expect(data.pricePerCredit).toBe(180000);
      expect(data.totalPaid).toBe(900000);
    });

    it('lists credits for a user', async () => {
      const coach = await createTestCoach();
      const pack = await createCreditPack(coach.id);
      await prisma.credit.create({
        data: {
          coachId: coach.id,
          userId: 'player1',
          userName: 'Player',
          userPhone: '0912345678',
          totalCredits: 5,
          remainingCredits: 3,
          pricePerCredit: 180000,
          totalPaid: 900000,
          paymentStatus: 'confirmed',
          expiresAt: new Date(Date.now() + 90 * 86400000),
        },
      });

      const req = makeRequest('/api/credits?userId=player1');
      const res = await creditsGET(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].remainingCredits).toBe(3);
    });
  });

  describe('Credit deducted on session booking', () => {
    it('decrements credit when booking with paymentMethod=credit', async () => {
      const { coach, venue, credit, date } = await setupCoachWithCredits('player1');

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
          userName: 'Player',
          userPhone: '0912345678',
          paymentMethod: 'credit',
        },
      });
      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.paymentStatus).toBe('paid');

      // Verify credit was decremented
      const updatedCredit = await prisma.credit.findUnique({ where: { id: credit.id } });
      expect(updatedCredit!.remainingCredits).toBe(4);
    });
  });

  describe('Credit refunded on cancellation (same coach, >24h)', () => {
    it('refunds credit when session is cancelled > 24h before start', async () => {
      const { coach, venue, credit, date } = await setupCoachWithCredits('player1');

      // Book with credit
      const bookReq = makeRequest('/api/sessions', {
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
          paymentMethod: 'credit',
        },
      });
      const bookRes = await sessionPOST(bookReq);
      const { data: session } = await parseResponse(bookRes);

      // Credit should be 4 now
      let cred = await prisma.credit.findUnique({ where: { id: credit.id } });
      expect(cred!.remainingCredits).toBe(4);

      // Cancel (session is 5 days ahead, well beyond 24h; cancellationHours default is 24)
      const cancelReq = makeRequest(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        body: { status: 'canceled' },
      });
      const cancelRes = await sessionPATCH(cancelReq, { params: Promise.resolve({ id: session.id }) });
      const { status } = await parseResponse(cancelRes);
      expect(status).toBe(200);

      // Credit should be refunded back to 5
      cred = await prisma.credit.findUnique({ where: { id: credit.id } });
      expect(cred!.remainingCredits).toBe(5);
    });
  });

  describe('Credit NOT refunded if cancellation within 24hrs', () => {
    it('does not refund credit when session cancelled <24h before start', async () => {
      // Use a coach with cancellationHours=0 so cancel is allowed but within 24h refund window
      const coach = await createTestCoach({ cancellationHours: 0 });
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const pack = await createCreditPack(coach.id);

      // Use a date that is tomorrow (within 24h of session start)
      const tomorrow = futureDate(1);
      const dow = futureDateDow(1);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow, startTime: '06:00', endTime: '22:00' });

      // Purchase + confirm credits
      const creditRecord = await prisma.credit.create({
        data: {
          coachId: coach.id,
          userId: 'player2',
          userName: 'Player',
          userPhone: '0912345678',
          totalCredits: 5,
          remainingCredits: 5,
          pricePerCredit: 180000,
          totalPaid: 900000,
          paymentStatus: 'confirmed',
          expiresAt: new Date(Date.now() + 90 * 86400000),
        },
      });

      // Book with credit
      const bookReq = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date: tomorrow,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'player2',
          userName: 'Player',
          userPhone: '0912345678',
          paymentMethod: 'credit',
        },
      });
      const bookRes = await sessionPOST(bookReq);
      const { data: session } = await parseResponse(bookRes);

      expect(session.paymentStatus).toBe('paid');
      let cred = await prisma.credit.findUnique({ where: { id: creditRecord.id } });
      expect(cred!.remainingCredits).toBe(4);

      // Cancel — session is tomorrow, <24h
      const cancelReq = makeRequest(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        body: { status: 'canceled' },
      });
      const cancelRes = await sessionPATCH(cancelReq, { params: Promise.resolve({ id: session.id }) });
      const { status } = await parseResponse(cancelRes);
      expect(status).toBe(200);

      // Credit should NOT be refunded (still 4)
      cred = await prisma.credit.findUnique({ where: { id: creditRecord.id } });
      expect(cred!.remainingCredits).toBe(4);
    });
  });

  describe('Booking rejected if credit balance=0 and paymentMethod=credit', () => {
    it('rejects booking when no credits available', async () => {
      const coach = await createTestCoach();
      const { venue, court } = await createTestVenueWithCourt();
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      const date = futureDate(5);
      const dow = futureDateDow(5);
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
          userName: 'Player',
          userPhone: '0912345678',
          paymentMethod: 'credit',
        },
      });
      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.error).toMatch(/no available credits/i);
    });
  });
});
