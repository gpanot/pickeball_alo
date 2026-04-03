import { NextRequest, NextResponse } from 'next/server';
import { validateAdminToken } from '@/lib/admin-session';

/**
 * CourtMap admin MVP: send `Authorization: Bearer <token>` from localStorage
 * after POST /api/admin/login.
 */
export function parseBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  if (!h?.toLowerCase().startsWith('bearer ')) return null;
  const t = h.slice(7).trim();
  return t || null;
}

export function adminUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Returns a NextResponse error if the request is not allowed for this venue. */
export function requireAdminVenue(
  req: NextRequest,
  venueId: string | null,
): NextResponse | null {
  if (!venueId) {
    return NextResponse.json({ error: 'venueId required' }, { status: 400 });
  }
  const token = parseBearerToken(req);
  if (!validateAdminToken(token, venueId)) {
    return adminUnauthorized();
  }
  return null;
}
