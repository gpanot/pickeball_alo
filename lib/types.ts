export interface CourtRaw {
  name?: string;
  address?: string;
  url?: string;
  latitude?: number | null;
  longitude?: number | null;
  hours?: string;
  phone?: string;
  rating?: number | null;
  ratingCount?: number;
  hasVoucher?: boolean;
  promotions?: string[];
  pricing_tables?: string[][][];
  pricing_table_names?: string[];
  flat_prices?: string[];
  [key: string]: unknown;
}

export interface Venue extends CourtRaw {
  id: number;
  minPrice: number | null;
  coords: [number, number] | null;
  _distanceKm?: number | null;
}
