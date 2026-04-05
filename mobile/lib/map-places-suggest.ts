import { API_BASE_URL } from './config';

const BASE = API_BASE_URL.replace(/\/$/, '');

export interface MapPlaceSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

export async function suggestMapPlaces(q: string): Promise<MapPlaceSuggestion[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const res = await fetch(`${BASE}/api/places/suggest?q=${encodeURIComponent(trimmed)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (x): x is MapPlaceSuggestion =>
      x != null &&
      typeof x === 'object' &&
      typeof (x as MapPlaceSuggestion).displayName === 'string' &&
      typeof (x as MapPlaceSuggestion).lat === 'number' &&
      typeof (x as MapPlaceSuggestion).lng === 'number',
  );
}
