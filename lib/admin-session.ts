import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_SEC = 24 * 60 * 60;

function adminSessionSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== 'production') {
    return 'courtmap-admin-dev-only-change-in-production';
  }
  return null;
}

/**
 * Stateless admin session: HMAC-signed payload survives Fast Refresh, multiple
 * route workers in dev, and serverless cold starts (unlike an in-memory Map).
 *
 * Set ADMIN_SESSION_SECRET in production (e.g. `openssl rand -hex 32`).
 */
export function createAdminSession(venueId: string): string {
  const secret = adminSessionSecret();
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is required in production');
  }

  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = JSON.stringify({ v: venueId, exp });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = sig.toString('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function validateAdminToken(
  token: string | undefined | null,
  expectedVenueId: string,
): boolean {
  if (!token) return false;
  const secret = adminSessionSecret();
  if (!secret) return false;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let sig: Buffer;
  try {
    sig = Buffer.from(sigB64, 'base64url');
  } catch {
    return false;
  }

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest();
  if (sig.length !== expectedSig.length || !timingSafeEqual(sig, expectedSig)) {
    return false;
  }

  let data: { v?: string; exp?: number };
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    data = JSON.parse(json) as { v?: string; exp?: number };
  } catch {
    return false;
  }

  if (data.v !== expectedVenueId) return false;
  if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  return true;
}
