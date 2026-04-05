import type { VenueResult, BookingResult, UserProfileData, SearchParams, BookingSlot } from './types';

const BASE = '';

export async function getVenueCatalogCount(): Promise<number> {
  const res = await fetch(`${BASE}/api/venues/count`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch venue count');
  const data = (await res.json()) as { count?: number };
  return typeof data.count === 'number' ? data.count : 0;
}

export async function searchVenues(params: SearchParams): Promise<VenueResult[]> {
  const qs = new URLSearchParams();
  if (params.query) qs.set('q', params.query);
  if (params.date) qs.set('date', params.date);
  if (params.startHour != null) qs.set('startHour', String(params.startHour));
  if (params.period) qs.set('period', params.period);
  if (params.sort) qs.set('sort', params.sort);
  if (params.lat != null) qs.set('lat', String(params.lat));
  if (params.lng != null) qs.set('lng', String(params.lng));
  if (params.radius != null) qs.set('radius', String(params.radius));

  const res = await fetch(`${BASE}/api/venues?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch venues');
  return res.json();
}

export async function getVenue(id: string, date: string): Promise<VenueResult> {
  const res = await fetch(`${BASE}/api/venues/${id}?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch venue');
  return res.json();
}

export async function createBooking(data: {
  venueId: string;
  venueName: string;
  venuePhone?: string;
  venueAddress?: string;
  userId: string;
  userName: string;
  userPhone: string;
  date: string;
  slots: BookingSlot[];
  totalPrice: number;
  notes?: string;
}): Promise<BookingResult> {
  const res = await fetch(`${BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 409) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === 'string' ? err.error : 'Those slots are no longer available');
  }
  if (!res.ok) throw new Error('Failed to create booking');
  return res.json();
}

export async function getBookings(userId: string): Promise<BookingResult[]> {
  const res = await fetch(`${BASE}/api/bookings?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

export async function cancelBooking(id: string, userId: string): Promise<BookingResult> {
  const res = await fetch(`${BASE}/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'canceled', userId }),
  });
  if (!res.ok) throw new Error('Failed to cancel booking');
  return res.json();
}

export async function markPaymentSubmitted(
  id: string,
  userId: string,
  paymentProofUrl: string,
): Promise<BookingResult> {
  const res = await fetch(`${BASE}/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'payment_submitted', userId, paymentProofUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === 'string' ? err.error : 'Failed to confirm payment');
  }
  return res.json();
}

export async function getProfile(phone: string): Promise<UserProfileData | null> {
  const res = await fetch(`${BASE}/api/profile/${encodeURIComponent(phone)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function upsertProfile(data: {
  name: string;
  phone: string;
  savedVenues?: string[];
}): Promise<UserProfileData> {
  const res = await fetch(`${BASE}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}
