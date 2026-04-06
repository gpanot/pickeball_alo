/**
 * Detect a real Postgres URL vs the build-time placeholder used when DATABASE_URL is unset during `npm run build`.
 */
export function isDatabaseConfigured(): boolean {
  const u = process.env.DATABASE_URL?.trim();
  if (!u) return false;
  if (u.includes('placeholder:placeholder@127.0.0.1')) return false;
  return true;
}
