import type {
  CoachResult,
  CoachSessionResult,
  CoachAvailabilityResult,
  CreditResult,
  CreditPackResult,
  CoachReviewResult,
  CoachVenueInviteResult,
} from './coach-types';

const BASE = '';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function searchCoaches(params: {
  q?: string;
  specialty?: string;
  minRating?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: 'rating' | 'price';
  limit?: number;
  offset?: number;
}): Promise<{ coaches: CoachResult[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.specialty) qs.set('specialty', params.specialty);
  if (params.minRating != null) qs.set('minRating', String(params.minRating));
  if (params.maxPrice != null) qs.set('maxPrice', String(params.maxPrice));
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.radius != null) qs.set('radius', String(params.radius));
  if (params.sort) qs.set('sort', params.sort);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const res = await fetch(`${BASE}/api/coaches?${qs}`);
  if (!res.ok) throw new Error('Failed to search coaches');
  return res.json();
}

export async function getCoach(id: string): Promise<CoachResult> {
  const res = await fetch(`${BASE}/api/coaches/${id}`);
  if (!res.ok) throw new Error('Failed to fetch coach');
  return res.json();
}

export async function getCoachAvailability(coachId: string, date?: string): Promise<CoachAvailabilityResult[]> {
  const qs = date ? `?date=${date}` : '';
  const res = await fetch(`${BASE}/api/coaches/${coachId}/availability${qs}`);
  if (!res.ok) throw new Error('Failed to fetch availability');
  const data = await res.json();
  return data.availability ?? data;
}

export async function createSession(body: {
  coachId: string;
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: '1on1' | 'group';
  userId: string;
  userName: string;
  userPhone: string;
  paymentMethod?: string;
}): Promise<CoachSessionResult> {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create session');
  }
  return res.json();
}

export async function getSession(id: string): Promise<CoachSessionResult> {
  const res = await fetch(`${BASE}/api/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function listSessions(params: {
  userId?: string;
  coachId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ sessions: CoachSessionResult[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.userId) qs.set('userId', params.userId);
  if (params.coachId) qs.set('coachId', params.coachId);
  if (params.status) qs.set('status', params.status);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const res = await fetch(`${BASE}/api/sessions?${qs}`);
  if (!res.ok) throw new Error('Failed to list sessions');
  return res.json();
}

export async function cancelSession(id: string): Promise<CoachSessionResult> {
  const res = await fetch(`${BASE}/api/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'canceled' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel session');
  }
  return res.json();
}

export async function submitPaymentProof(sessionId: string, userId: string, paymentProofUrl: string): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, paymentProofUrl }),
  });
  if (!res.ok) throw new Error('Failed to submit payment');
}

export async function joinGroupSession(sessionId: string, body: {
  userId: string;
  userName: string;
  userPhone: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to join session');
  }
}

export async function listCredits(userId: string): Promise<CreditResult[]> {
  const res = await fetch(`${BASE}/api/credits?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to list credits');
  const data = await res.json();
  return data.credits ?? data;
}

export async function purchaseCredits(body: {
  coachId: string;
  userId: string;
  userName: string;
  userPhone: string;
  creditPackId: string;
}): Promise<CreditResult> {
  const res = await fetch(`${BASE}/api/credits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to purchase credits');
  return res.json();
}

export async function getCoachReviews(coachId: string, limit = 10, offset = 0): Promise<{
  reviews: CoachReviewResult[];
  total: number;
}> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/reviews?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function submitReview(coachId: string, body: {
  sessionId?: string;
  userId: string;
  userName: string;
  ratingOnTime: number;
  ratingFriendly: number;
  ratingProfessional: number;
  ratingRecommend: number;
  comment?: string;
}): Promise<CoachReviewResult> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
}

export async function flagPayment(sessionId: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/flag-payment`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to flag payment');
  }
}

export async function getCoachInvites(coachId: string, token: string): Promise<CoachVenueInviteResult[]> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/invites`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch invites');
  const data = await res.json();
  return data.invites ?? data;
}

export async function respondToInvite(
  coachId: string,
  inviteId: string,
  action: 'accept' | 'decline',
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/invites/${inviteId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to respond to invite');
}

export async function coachLogin(phone: string, password: string): Promise<{
  token: string;
  coach: CoachResult;
}> {
  const res = await fetch(`${BASE}/api/coaches/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid credentials');
  }
  return res.json();
}

export async function coachRegister(body: {
  name: string;
  phone: string;
  password: string;
  email?: string;
  hourlyRate1on1: number;
  hourlyRateGroup?: number;
  bio?: string;
  certifications?: string[];
  specialties?: string[];
}): Promise<{ token: string; coach: CoachResult }> {
  const res = await fetch(`${BASE}/api/coaches/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}
