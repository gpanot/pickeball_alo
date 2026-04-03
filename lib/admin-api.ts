/** Admin API: always send `Authorization: Bearer <token>` after login. */

export function adminAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function withVenueQuery(path: string, venueId: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}venueId=${encodeURIComponent(venueId)}`;
}
