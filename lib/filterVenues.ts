import { haversineKm } from './geo';
import { venueCoversSlot } from './hours';
import type { Venue } from './types';

export type SortMode =
  | 'name'
  | 'price_asc'
  | 'price_desc'
  | 'distance_asc'
  | 'cheap_nearby';

export interface FilterParams {
  query: string;
  sortMode: SortMode;
  strictHours: boolean;
  userLat: number | null;
  userLng: number | null;
  radiusKm: number;
  slotStartMin: number;
  durationMin: number;
}

export function filterAndSortVenues(
  venues: Venue[],
  p: FilterParams
): Venue[] {
  const q = p.query.trim().toLowerCase();
  const rows = venues.map((v) => ({ ...v }));

  let filtered = rows.filter((v) => {
    if (
      !(v.name || '').toLowerCase().includes(q) &&
      !(v.address || '').toLowerCase().includes(q)
    ) {
      return false;
    }

    if (p.userLat != null && p.userLng != null) {
      if (!v.coords) return false;
      const d = haversineKm(
        p.userLat,
        p.userLng,
        v.coords[0],
        v.coords[1]
      );
      v._distanceKm = d;
      if (d > p.radiusKm) return false;
    } else {
      v._distanceKm = v.coords ? null : null;
    }

    if (p.strictHours) {
      const cov = venueCoversSlot(v, p.slotStartMin, p.durationMin);
      if (cov === false) return false;
    }

    return true;
  });

  const sort = p.sortMode;
  filtered.sort((a, b) => {
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sort === 'price_asc')
      return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    if (sort === 'price_desc')
      return (b.minPrice ?? -Infinity) - (a.minPrice ?? -Infinity);
    if (sort === 'distance_asc') {
      const da = a._distanceKm != null ? a._distanceKm : Infinity;
      const db = b._distanceKm != null ? b._distanceKm : Infinity;
      if (da !== db) return da - db;
      return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    }
    if (sort === 'cheap_nearby') {
      const pa = a.minPrice ?? Infinity;
      const pb = b.minPrice ?? Infinity;
      if (pa !== pb) return pa - pb;
      const da = a._distanceKm != null ? a._distanceKm : Infinity;
      const db = b._distanceKm != null ? b._distanceKm : Infinity;
      return da - db;
    }
    return 0;
  });

  return filtered;
}
