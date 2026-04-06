#!/usr/bin/env node
/**
 * Prisma validates env("DATABASE_URL") in schema.prisma even when prisma.config.ts has a fallback URL.
 * Ensure a placeholder is set so `prisma generate` works without a real DB (e.g. CI / Vercel install).
 */
import { spawnSync } from 'node:child_process';

const PLACEHOLDER =
  'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public';

const env = { ...process.env };
if (!env.DATABASE_URL) {
  env.DATABASE_URL = PLACEHOLDER;
}

const r = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', env, shell: true });
process.exit(r.status ?? 1);
