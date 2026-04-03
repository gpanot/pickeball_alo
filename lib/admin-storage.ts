export const ADMIN_TOKEN_KEY = 'cm_admin_token';
export const ADMIN_VENUE_ID_KEY = 'cm_admin_venueId';
export const ADMIN_VENUE_NAME_KEY = 'cm_admin_venueName';

export type AdminSession = { token: string; venueId: string; venueName: string };

export function readAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const venueId = localStorage.getItem(ADMIN_VENUE_ID_KEY);
  if (!token || !venueId) return null;
  const venueName = localStorage.getItem(ADMIN_VENUE_NAME_KEY) ?? 'Venue';
  return { token, venueId, venueName };
}

export function writeAdminSession(session: AdminSession) {
  localStorage.setItem(ADMIN_TOKEN_KEY, session.token);
  localStorage.setItem(ADMIN_VENUE_ID_KEY, session.venueId);
  localStorage.setItem(ADMIN_VENUE_NAME_KEY, session.venueName);
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_VENUE_ID_KEY);
  localStorage.removeItem(ADMIN_VENUE_NAME_KEY);
}
