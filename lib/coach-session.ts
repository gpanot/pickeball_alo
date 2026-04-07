import jwt from 'jsonwebtoken';

const DEV_FALLBACK = 'dev-coach-jwt-secret-do-not-use-in-prod';

function coachJwtSecretForSigning(): string {
  const fromEnv = process.env.COACH_JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('COACH_JWT_SECRET_MISSING');
  }
  return DEV_FALLBACK;
}

/** Returns null in production when secret is unset so verify fails closed without throwing. */
function coachJwtSecretForVerify(): string | null {
  const fromEnv = process.env.COACH_JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') return null;
  return DEV_FALLBACK;
}

if (process.env.NODE_ENV === 'production' && !process.env.COACH_JWT_SECRET?.trim()) {
  console.warn('COACH_JWT_SECRET is not set — coach login/register will return 503 until it is set');
}

export interface CoachJwtPayload {
  sub: string;
  phone: string;
  plan: string;
}

export function signCoachToken(coachId: string, phone: string, plan: string): string {
  const secret = coachJwtSecretForSigning();
  return jwt.sign({ sub: coachId, phone, plan } satisfies CoachJwtPayload, secret, {
    expiresIn: '7d',
  });
}

export function verifyCoachToken(token: string): CoachJwtPayload | null {
  try {
    const secret = coachJwtSecretForVerify();
    if (!secret) return null;
    const payload = jwt.verify(token, secret) as CoachJwtPayload;
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}
