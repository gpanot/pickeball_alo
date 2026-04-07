import jwt from 'jsonwebtoken';

const SECRET = process.env.COACH_JWT_SECRET
  || (process.env.NODE_ENV === 'production' ? '' : 'dev-coach-jwt-secret-do-not-use-in-prod');

if (process.env.NODE_ENV === 'production' && !process.env.COACH_JWT_SECRET) {
  console.warn('COACH_JWT_SECRET is not set — coach auth will fail in production');
}

export interface CoachJwtPayload {
  sub: string;
  phone: string;
  plan: string;
}

export function signCoachToken(coachId: string, phone: string, plan: string): string {
  return jwt.sign({ sub: coachId, phone, plan } satisfies CoachJwtPayload, SECRET, {
    expiresIn: '7d',
  });
}

export function verifyCoachToken(token: string): CoachJwtPayload | null {
  try {
    const payload = jwt.verify(token, SECRET) as CoachJwtPayload;
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}
