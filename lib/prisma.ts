import { PrismaClient } from '@/lib/generated/prisma/client';

/**
 * Single PrismaClient per serverless isolate (Vercel / Node).
 * Do not gate this on NODE_ENV — without `globalThis` reuse, each invocation opens new pools and causes 500s.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;
