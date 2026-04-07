/**
 * Set every coach's password to the same bcrypt hash (default: 123456).
 * Uses DATABASE_URL from the environment (e.g. Railway DATABASE_PUBLIC_URL on your machine).
 *
 *   DATABASE_URL="postgresql://..." node scripts/reset-coach-passwords.mjs
 *   # or:
 *   DATABASE_URL="$(railway variables --json | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).DATABASE_PUBLIC_URL")" node scripts/reset-coach-passwords.mjs
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const password = process.argv[2] || '123456';
const url = process.env.DATABASE_URL?.replace(/\\n$/, '').trim().replace(/^"|"$/g, '');
if (!url) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const coaches = await prisma.coach.findMany({
    select: { id: true, phone: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Found ${coaches.length} coach(es):`, coaches);
  if (coaches.length === 0) {
    process.exit(0);
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = await prisma.coach.updateMany({ data: { passwordHash: hash } });
  console.log(`Updated passwordHash for ${r.count} row(s) (plain password: ${password})`);
} finally {
  await prisma.$disconnect();
}
