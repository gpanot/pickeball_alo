#!/usr/bin/env node
/**
 * Vercel: schema.prisma requires DATABASE_URL to exist for CLI validation.
 * - If unset: inject placeholder for `prisma generate`, skip `migrate deploy`, still run `next build`.
 * - If set: generate + migrate deploy + next build (production).
 */
import { spawnSync } from 'node:child_process';

const PLACEHOLDER =
  'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public';

const hadDatabaseUrl = Boolean(process.env.DATABASE_URL);
const env = { ...process.env };
if (!env.DATABASE_URL) {
  env.DATABASE_URL = PLACEHOLDER;
  console.warn(
    '[build] DATABASE_URL unset: prisma generate uses a placeholder. Add DATABASE_URL to Vercel (Build + Production) for migrations and live API.',
  );
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npx', ['prisma', 'generate']);

if (hadDatabaseUrl) {
  run('npx', ['prisma', 'migrate', 'deploy']);
} else {
  console.warn('[build] Skipping prisma migrate deploy (no DATABASE_URL).');
}

run('npx', ['next', 'build']);
