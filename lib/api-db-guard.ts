import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db-env';

/** 503 when DATABASE_URL is missing at runtime (common if only build env was fixed). */
export function databaseNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'database_not_configured',
      message:
        'Server DATABASE_URL is not set. In Vercel: Settings → Environment Variables → add DATABASE_URL for Production (and Preview), enable it for Runtime, then redeploy.',
    },
    { status: 503 },
  );
}

export function guardDatabaseOr503(): NextResponse | null {
  if (!isDatabaseConfigured()) return databaseNotConfiguredResponse();
  return null;
}

export function prismaRouteErrorResponse(context: string, err: unknown): NextResponse {
  console.error(`[api-db] ${context}`, err);
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    {
      error: 'database_error',
      detail,
    },
    { status: 500 },
  );
}
