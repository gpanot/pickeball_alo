/**
 * Local venue metadata cache — pre-loads all venues at startup so venue
 * detail views can render instantly before slot data arrives.
 * Isolated module: safe to delete without affecting the rest of the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import type { VenueResult } from './types';

const BASE = API_BASE_URL.replace(/\/$/, '');
const CACHE_KEY = 'vc_venues';
const SYNC_KEY = 'vc_lastSyncAt';

type CachedVenue = Omit<VenueResult, 'distance'>;

let memoryCache: Map<string, CachedVenue> | null = null;

async function loadFromDisk(): Promise<Map<string, CachedVenue>> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
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

async function persistToDisk(): Promise<void> {
  if (!memoryCache) return;
  try {
    const arr = Array.from(memoryCache.values());
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(arr));
  } catch {
    /* best-effort */
  }
}

export async function syncVenues(): Promise<number> {
  const cache = await loadFromDisk();
  const since = await AsyncStorage.getItem(SYNC_KEY);

  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`${BASE}/api/venues/bulk${qs}`);
  if (!res.ok) throw new Error('Bulk venue sync failed');

  const { syncedAt, venues } = (await res.json()) as {
    syncedAt: string;
    venues: CachedVenue[];
  };

  for (const v of venues) {
    cache.set(v.id, v);
  }

  await persistToDisk();
  await AsyncStorage.setItem(SYNC_KEY, syncedAt);
  return venues.length;
}

export async function getCachedVenue(
  id: string,
): Promise<CachedVenue | null> {
  const cache = await loadFromDisk();
  return cache.get(id) ?? null;
}

export async function getAllCachedVenues(): Promise<CachedVenue[]> {
  const cache = await loadFromDisk();
  return Array.from(cache.values());
}

export async function clearCache(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.multiRemove([CACHE_KEY, SYNC_KEY]);
}
