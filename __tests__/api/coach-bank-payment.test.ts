/**
 * Coach bank details + VietQR payment integration tests.
 *
 * Covers:
 * - PATCH bank fields (bankName, bankAccountName, bankAccountNumber, bankBin)
 * - PATCH SePay fields (autoApprovalPhone, autoApprovalCCCD)
 * - GET /api/coaches/[id] returns bank fields in publicCoachSelect
 * - Login returns bank + SePay fields
 * - Validation (type checks, null clearing)
 * - Session payment flow with coach bank details available
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

import { POST as loginPOST } from '@/app/api/coaches/login/route';
import { GET as coachGET, PATCH as coachPATCH } from '@/app/api/coaches/[id]/route';
import { POST as sessionPOST } from '@/app/api/sessions/route';
import { GET as sessionGET } from '@/app/api/sessions/[id]/route';
import { PATCH as paymentPATCH } from '@/app/api/sessions/[id]/payment/route';

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

describe('Coach bank details + payment integration', () => {
  // ── PATCH bank fields ─────────────────────────────────────────────
  describe('PATCH bank fields', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Bank Coach' });
    });

    it('sets all four bank fields', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: {
          bankName: 'Vietcombank',
          bankAccountName: 'NGUYEN VAN A',
          bankAccountNumber: '0123456789',
          bankBin: '970436',
        },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bankName).toBe('Vietcombank');
      expect(data.coach.bankAccountName).toBe('NGUYEN VAN A');
      expect(data.coach.bankAccountNumber).toBe('0123456789');
      expect(data.coach.bankBin).toBe('970436');
    });

    it('sets autoApprovalPhone and autoApprovalCCCD', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: {
          autoApprovalPhone: '0901234567',
          autoApprovalCCCD: '012345678901',
        },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.autoApprovalPhone).toBe('0901234567');
      expect(data.coach.autoApprovalCCCD).toBe('012345678901');
    });

    it('clears bank fields with null', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: {
          bankName: null,
          bankAccountName: null,
          bankAccountNumber: null,
          bankBin: null,
          autoApprovalPhone: null,
          autoApprovalCCCD: null,
        },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bankName).toBeNull();
      expect(data.coach.bankAccountNumber).toBeNull();
      expect(data.coach.bankBin).toBeNull();
      expect(data.coach.autoApprovalPhone).toBeNull();
      expect(data.coach.autoApprovalCCCD).toBeNull();
    });

    it('rejects non-string bankBin', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: { bankBin: 970436 },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('rejects non-string autoApprovalCCCD', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: { autoApprovalCCCD: 123456789012 },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('forbids PATCH from a different coach', async () => {
      const other = await createTestCoach({ name: 'Other Coach' });
      const req = coachReq(`/api/coaches/${coach.id}`, other.id, other.phone, {
        method: 'PATCH',
        body: { bankName: 'Hacked' },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });
  });

  // ── GET returns bank fields ───────────────────────────────────────
  describe('GET /api/coaches/[id] includes bank fields', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;

    beforeAll(async () => {
      coach = await createTestCoach({
        name: 'GET Bank Coach',
        bankName: 'MB Bank',
        bankAccountName: 'TRAN THI B',
        bankAccountNumber: '9876543210',
        bankBin: '970422',
      });
    });

    it('returns bank fields in the public GET response', async () => {
      const req = makeRequest(`/api/coaches/${coach.id}`);
      const res = await coachGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bankName).toBe('MB Bank');
      expect(data.coach.bankAccountName).toBe('TRAN THI B');
      expect(data.coach.bankAccountNumber).toBe('9876543210');
      expect(data.coach.bankBin).toBe('970422');
    });

    it('does NOT expose autoApproval fields in public GET', async () => {
      await prisma.coach.update({
        where: { id: coach.id },
        data: { autoApprovalPhone: '0909999999', autoApprovalCCCD: '999888777666' },
      });
      const req = makeRequest(`/api/coaches/${coach.id}`);
      const res = await coachGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { data } = await parseResponse(res);
      expect(data.coach.autoApprovalPhone).toBeUndefined();
      expect(data.coach.autoApprovalCCCD).toBeUndefined();
    });
  });

  // ── Login returns bank fields ─────────────────────────────────────
  describe('Login includes bank + SePay fields', () => {
    const phone = `09${Date.now().toString().slice(-8)}`;

    beforeAll(async () => {
      await createTestCoach({
        phone,
        name: 'Login Bank Coach',
        bankName: 'Techcombank',
        bankAccountName: 'LE VAN C',
        bankAccountNumber: '1111222233',
        bankBin: '970407',
        autoApprovalPhone: '0905551234',
        autoApprovalCCCD: '001002003004',
      });
    });

    it('login response contains all bank and SePay fields', async () => {
      const req = makeRequest('/api/coaches/login', {
        method: 'POST',
        body: { phone, password: 'testpass123' },
      });
      const res = await loginPOST(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bankName).toBe('Techcombank');
      expect(data.coach.bankAccountName).toBe('LE VAN C');
      expect(data.coach.bankAccountNumber).toBe('1111222233');
      expect(data.coach.bankBin).toBe('970407');
      expect(data.coach.autoApprovalPhone).toBe('0905551234');
      expect(data.coach.autoApprovalCCCD).toBe('001002003004');
    });
  });

  // ── Session payment flow with coach bank details ──────────────────
  describe('Session payment flow uses coach bank details', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;
    let venue: { id: string };
    let court: { id: string };
    let sessionId: string;
    const date = futureDate(7);
    const dow = futureDateDow(7);

    beforeAll(async () => {
      coach = await createTestCoach({
        name: 'Payment Flow Coach',
        bankName: 'BIDV',
        bankAccountName: 'PHAM VAN D',
        bankAccountNumber: '5555666677',
        bankBin: '970418',
      });
      const vc = await createTestVenueWithCourt();
      venue = vc.venue;
      court = vc.court;
      await linkCoachToVenue(coach.id, venue.id, [court.id]);
      await addAvailability(coach.id, venue.id, { dayOfWeek: dow });
    });

    it('creates a session with correct fee structure', async () => {
      const req = makeRequest('/api/sessions', {
        method: 'POST',
        body: {
          coachId: coach.id,
          venueId: venue.id,
          date,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: '1on1',
          userId: 'payer1',
          userName: 'Test Payer',
          userPhone: '0900000010',
        },
      });
      const res = await sessionPOST(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.coachFee).toBeGreaterThan(0);
      expect(data.totalPerPlayer).toBeGreaterThanOrEqual(data.coachFee);
      sessionId = data.id;
    });

    it('GET coach returns bank details needed for VietQR', async () => {
      const req = makeRequest(`/api/coaches/${coach.id}`);
      const res = await coachGET(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bankBin).toBe('970418');
      expect(data.coach.bankAccountNumber).toBe('5555666677');
      expect(data.coach.bankAccountName).toBe('PHAM VAN D');
    });

    it('player submits payment proof for session', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}/payment`, {
        method: 'PATCH',
        body: {
          userId: 'payer1',
          paymentProofUrl: 'manual-confirmation',
        },
      });
      const res = await paymentPATCH(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.paymentStatus).toBe('payment_submitted');
    });

    it('session detail shows payment_submitted status', async () => {
      const req = makeRequest(`/api/sessions/${sessionId}`);
      const res = await sessionGET(req, { params: Promise.resolve({ id: sessionId }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.paymentStatus).toBe('payment_submitted');
      expect(data.participants[0].paymentStatus).toBe('payment_submitted');
    });
  });

  // ── Combined PATCH: bank + profile fields ─────────────────────────
  describe('Combined bank + profile updates', () => {
    let coach: Awaited<ReturnType<typeof createTestCoach>>;

    beforeAll(async () => {
      coach = await createTestCoach({ name: 'Combined Coach' });
    });

    it('updates profile and bank fields in a single PATCH', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: {
          bio: 'I teach tennis',
          bankName: 'VPBank',
          bankBin: '970432',
          bankAccountNumber: '7777888899',
          bankAccountName: 'HOANG VAN E',
          autoApprovalPhone: '0912345678',
        },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bio).toBe('I teach tennis');
      expect(data.coach.bankName).toBe('VPBank');
      expect(data.coach.bankBin).toBe('970432');
      expect(data.coach.bankAccountNumber).toBe('7777888899');
      expect(data.coach.bankAccountName).toBe('HOANG VAN E');
      expect(data.coach.autoApprovalPhone).toBe('0912345678');
    });

    it('partial update preserves untouched bank fields', async () => {
      const req = coachReq(`/api/coaches/${coach.id}`, coach.id, coach.phone, {
        method: 'PATCH',
        body: { bio: 'Updated bio only' },
      });
      const res = await coachPATCH(req, { params: Promise.resolve({ id: coach.id }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.coach.bio).toBe('Updated bio only');
      expect(data.coach.bankBin).toBe('970432');
      expect(data.coach.bankAccountNumber).toBe('7777888899');
    });
  });
});
