import { API_BASE_URL } from './config';

const BASE = API_BASE_URL.replace(/\/$/, '');

export interface PlayerProfileResult {
  id: string;
  name: string;
  phone: string;
  phoneVerified?: boolean;
  gender?: string | null;
  savedVenues: string[];
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('application/json')) {
    const err = await res.json().catch(() => ({}));
    if (typeof err?.error === 'string' && err.error.trim().length > 0) return err.error;
    if (typeof err?.message === 'string' && err.message.trim().length > 0) return err.message;
    return fallback;
  }

  // Do not leak HTML error pages/proxy responses into the UI.
  if (contentType.includes('text/html')) {
    return fallback;
  }

  const text = await res.text().catch(() => '');
  if (text.trim().length > 0) return text.slice(0, 120);
  return fallback;
}

export async function playerLogin(
  phone: string,
  password: string,
): Promise<PlayerProfileResult> {
  const res = await fetch(`${BASE}/api/players/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const msg = await readApiError(res, 'Invalid credentials');
    throw new Error(msg);
  }
  const data = await res.json();
  return data.profile as PlayerProfileResult;
}

export async function playerRegister(body: {
  name: string;
  phone: string;
  password: string;
  gender?: string;
}): Promise<PlayerProfileResult> {
  const res = await fetch(`${BASE}/api/players/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await readApiError(res, 'Registration failed');
    throw new Error(msg);
  }
  const data = await res.json();
  return data.profile as PlayerProfileResult;
}

export async function verifyPlayerPhone(body: {
  phone: string;
  name?: string;
}): Promise<PlayerProfileResult> {
  const res = await fetch(`${BASE}/api/players/verify-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to sync phone verification');
  const data = await res.json();
  return data.profile as PlayerProfileResult;
}
