export interface VenueResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  hours: string | null;
  rating: number | null;
  reviewCount: number;
  priceMin: number | null;
  priceMax: number | null;
  tags: string[];
  amenities: string[];
  images: string[];
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  googleUrl: string | null;
  distance?: number;
  courts: CourtResult[];
}

export interface CourtResult {
  id: string;
  name: string;
  note: string | null;
  isAvailable: boolean;
  slots: SlotResult[];
}

export interface SlotResult {
  id: string;
  time: string;
  price: number;
  isBooked: boolean;
}

export interface BookingSlot {
  courtName: string;
  time: string;
  duration: number;
  price: number;
}

export type BookingStatus = 'pending' | 'booked' | 'paid' | 'canceled';

export interface BookingResult {
  id: string;
  orderId: string;
  venueId: string;
  venueName: string;
  venuePhone: string | null;
  venueAddress: string | null;
  userId: string;
  userName: string;
  userPhone: string;
  date: string;
  slots: BookingSlot[];
  totalPrice: number;
  notes: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileData {
  id: string;
  name: string;
  phone: string;
  savedVenues: string[];
}

export type SortMode = 'distance' | 'price' | 'rating';
export type PeriodKey = 'morning' | 'noon' | 'afternoon' | 'night';
export type Screen = 'search' | 'results' | 'map' | 'saved' | 'bookings' | 'profile';

export interface SearchParams {
  query: string;
  date: string;
  duration: string;
  /** Filter slots to this clock hour (0–23). Preferred over `period` when both are used. */
  startHour?: number;
  period?: PeriodKey;
  lat?: number;
  lng?: number;
  radius?: number;
  sort: SortMode;
}
