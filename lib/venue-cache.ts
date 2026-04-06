/**
 * Local venue metadata cache — pre-loads all venues at startup so venue
 * detail views can render instantly before slot data arrives.
 * Uses localStorage (web) instead of AsyncStorage (mobile).
 */
import type { VenueResult } from './types';

const CACHE_KEY = 'vc_venues';
const SYNC_KEY = 'vc_lastSyncAt';

type CachedVenue = Omit<VenueResult, 'distance'>;

let memoryCache: Map<string, CachedVenue> | null = null;

function loadFromDisk(): Map<string, CachedVenue> {
  if (memoryCache) return memoryCache;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) {
      const arr: CachedVenue[] = JSON.parse(raw);
      memoryCache = new Map(arr.map((v) => [v.id, v]));
    } else {
      memoryCache = new Map();
    }
  } catch {
    memoryCache = new Map();
  }
  return memoryCache;
}

function persistToDisk(): void {
  if (!memoryCache || typeof window === 'undefined') return;
  try {
    const arr = Array.from(memoryCache.values());
    localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
  } catch {
    /* best-effort */
  }
}

export async function syncVenues(): Promise<number> {
  const cache = loadFromDisk();
  const since = typeof window !== 'undefined' ? localStorage.getItem(SYNC_KEY) : null;

  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`/api/venues/bulk${qs}`);
  if (!res.ok) throw new Error('Bulk venue sync failed');

  const { syncedAt, venues } = (await res.json()) as {
    syncedAt: string;
    venues: CachedVenue[];
  };

  for (const v of venues) {
    cache.set(v.id, v);
  }

  persistToDisk();
  if (typeof window !== 'undefined') {
    localStorage.setItem(SYNC_KEY, syncedAt);
  }
  return venues.length;
}

export function getCachedVenue(id: string): CachedVenue | null {
  const cache = loadFromDisk();
  return cache.get(id) ?? null;
}
