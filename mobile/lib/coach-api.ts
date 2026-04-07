import type {
  CoachResult,
  CoachSessionResult,
  CoachAvailabilityResult,
  CreditResult,
  CoachReviewResult,
  CoachVenueInviteResult,
} from './coach-types';
import { API_BASE_URL } from './config';

const BASE = API_BASE_URL.replace(/\/$/, '');

async function readApiError(res: Response, fallback: string): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const err = await res.json().catch(() => ({}));
    if (typeof err?.error === 'string' && err.error.trim().length > 0) return err.error;
    if (typeof err?.message === 'string' && err.message.trim().length > 0) return err.message;
  } else {
    const text = await res.text().catch(() => '');
    if (text.trim().length > 0) return text.slice(0, 160);
  }
  return fallback;
}

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
  const data = await res.json();
  return data.coach ?? data;
}

export async function getCoachAvailability(
  coachId: string,
  date?: string,
): Promise<CoachAvailabilityResult[]> {
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
  if (!res.ok) {
    const msg = await readApiError(res, 'Failed to list sessions');
    throw new Error(msg);
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return { sessions: data as CoachSessionResult[], total: data.length };
  }
  if (Array.isArray(data?.sessions)) {
    return {
      sessions: data.sessions as CoachSessionResult[],
      total: typeof data.total === 'number' ? data.total : data.sessions.length,
    };
  }
  return { sessions: [], total: 0 };
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

export async function submitPaymentProof(
  sessionId: string,
  userId: string,
  paymentProofUrl: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, paymentProofUrl }),
  });
  if (!res.ok) throw new Error('Failed to submit payment');
}

export async function joinGroupSession(
  sessionId: string,
  body: {
    userId: string;
    userName: string;
    userPhone: string;
  },
): Promise<void> {
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

export async function leaveGroupSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/api/sessions/${sessionId}/leave?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to leave session');
  }
}

export async function listCredits(userId: string): Promise<CreditResult[]> {
  const res = await fetch(`${BASE}/api/credits?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to list credits');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
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

export async function getCoachReviews(
  coachId: string,
  limit = 10,
  offset = 0,
): Promise<{
  reviews: CoachReviewResult[];
  total: number;
}> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/reviews?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function submitReview(
  coachId: string,
  body: {
    sessionId?: string;
    userId: string;
    userName: string;
    ratingOnTime: number;
    ratingFriendly: number;
    ratingProfessional: number;
    ratingRecommend: number;
    comment?: string;
  },
): Promise<CoachReviewResult> {
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

export async function coachLogin(
  phone: string,
  password: string,
): Promise<{
  token: string;
  coach: CoachResult;
}> {
  const res = await fetch(`${BASE}/api/coaches/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const msg = await readApiError(res, 'Invalid credentials');
    throw new Error(msg);
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
  languages?: string[];
  focusLevels?: string[];
  groupSizes?: string[];
  experienceBand?: string;
}): Promise<{ token: string; coach: CoachResult }> {
  const res = await fetch(`${BASE}/api/coaches/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await readApiError(res, 'Registration failed');
    throw new Error(msg);
  }
  return res.json();
}

export interface CoachSubscriptionResult {
  plan: string;
  expires: string | null;
  isExpired: boolean;
  trialBookingsUsed?: number;
}

export async function getCoachSubscription(
  coachId: string,
  token: string,
): Promise<CoachSubscriptionResult> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/subscription`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to load subscription');
  return res.json();
}

export async function upgradeCoachSubscription(
  coachId: string,
  token: string,
  plan: 'standard' | 'pro',
): Promise<{ price?: number; plan?: string }> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/subscription`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upgrade subscription');
  }
  return res.json();
}

export async function updateCoachProfile(
  coachId: string,
  token: string,
  body: Record<string, unknown>,
): Promise<CoachResult> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update profile');
  }
  const data = await res.json();
  return data.coach ?? data;
}

export interface CoachCourtLinkAdminResult {
  id: string;
  venueId: string;
  courtIds: string[];
  isActive: boolean;
  venue?: { name?: string; address?: string };
}

export async function listCoachCourts(coachId: string): Promise<CoachCourtLinkAdminResult[]> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/courts`);
  if (!res.ok) throw new Error('Failed to load coach courts');
  return res.json();
}

export async function addCoachCourt(
  coachId: string,
  venueId: string,
  token: string,
): Promise<CoachCourtLinkAdminResult> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/courts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ venueId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not add court');
  }
  return res.json();
}

export async function removeCoachCourt(
  coachId: string,
  venueId: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/courts?venueId=${encodeURIComponent(venueId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not remove court');
  }
}

export interface VenueSearchResult {
  id: string;
  name: string;
  address: string;
}

export async function searchVenuesByName(q: string): Promise<VenueSearchResult[]> {
  const qs = new URLSearchParams();
  qs.set('q', q);
  const res = await fetch(`${BASE}/api/venues?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to search venues');
  return res.json();
}

export async function saveCoachAvailability(
  coachId: string,
  token: string,
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    venueId: string;
    date: null;
    isBlocked: boolean;
  }>,
): Promise<void> {
  const res = await fetch(`${BASE}/api/coaches/${coachId}/availability`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ availability }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save availability');
  }
}

export async function updateSessionStatus(
  sessionId: string,
  token: string,
  status: 'completed' | 'canceled',
): Promise<CoachSessionResult> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update session status');
  }
  return res.json();
}
