import type { CourtRaw, Venue } from './types';
import { guessCoords } from './geo';
import { getMinPrice } from './venuePrice';

export function enrichVenues(data: CourtRaw[]): Venue[] {
  return data.map((v, i) => ({
    ...v,
    id: i,
    minPrice: getMinPrice(v),
    coords:
      v.latitude && v.longitude
        ? [v.latitude as number, v.longitude as number]
        : guessCoords(v.address),
  }));
}
