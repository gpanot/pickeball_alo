import { NextRequest, NextResponse } from 'next/server';

/** Proxy OSM Nominatim (usage policy: identify app via User-Agent). Vietnam-focused. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 200) ?? '';
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost';
    const appUrl = host.startsWith('http') ? host : `https://${host}`;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '6');
    url.searchParams.set('q', q);
    url.searchParams.set('countrycodes', 'vn');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': `CourtMap/1.0 (${appUrl})`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const raw = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const out = raw
      .map((row) => {
        const lat = row.lat != null ? parseFloat(row.lat) : NaN;
        const lng = row.lon != null ? parseFloat(row.lon) : NaN;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          displayName: String(row.display_name ?? '').slice(0, 200),
          lat,
          lng,
        };
      })
      .filter(Boolean);

    return NextResponse.json(out);
  } catch {
    return NextResponse.json([]);
  }
}
