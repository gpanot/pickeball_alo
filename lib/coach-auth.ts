import { NextRequest, NextResponse } from 'next/server';
import { verifyCoachToken, type CoachJwtPayload } from './coach-session';

export function parseCoachBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/**
 * Validates coach JWT from Authorization header.
 * Returns the decoded payload on success, or a 401 NextResponse on failure.
 */
export function requireCoach(req: NextRequest): CoachJwtPayload | NextResponse {
  const token = parseCoachBearer(req);
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }
  const payload = verifyCoachToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  return payload;
}

/**
 * Optional coach auth — returns payload if valid token present, null otherwise.
 * Does not reject the request if no token is provided.
 */
export function optionalCoach(req: NextRequest): CoachJwtPayload | null {
  const token = parseCoachBearer(req);
  if (!token) return null;
  return verifyCoachToken(token);
}
