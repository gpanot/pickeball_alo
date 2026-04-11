/** Structured venue pricing (time bands, walk-in + optional member). */
export interface StructuredPricingRow {
  startTime: string;
  endTime: string;
  walkIn: number;
  member: number | null;
}

export interface StructuredPricingTable {
  id: string;
  name: string;
  dayTypes: string[];
  rows: StructuredPricingRow[];
  sortOrder: number;
}

export interface VenuePaymentResult {
  id: string;
  bank: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
  bankBin: string | null;
  isDefaultForDynamicQr: boolean;
  sortOrder?: number;
}

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
  hasMemberPricing?: boolean;
  use30MinSlots?: boolean;
  zaloId?: string | null;
  pricingTables?: StructuredPricingTable[] | null;
  payments?: VenuePaymentResult[];
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
  memberPrice?: number | null;
  isBooked: boolean;
}

export interface BookingSlot {
  courtName: string;
  time: string;
  duration: number;
  price: number;
}

export interface EditHistoryEntry {
  timestamp: string;
  oldSlots: BookingSlot[];
  newSlots: BookingSlot[];
  oldPrice: number;
  newPrice: number;
  priceDelta: number;
  supplementaryProofUrl?: string | null;
}

export type BookingStatus = 'pending' | 'payment_submitted' | 'paid' | 'canceled';

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
  adminNote?: string | null;
  paymentNote?: string | null;
  paymentProofUrl?: string | null;
  paymentDeadline?: string | null;
  paymentSubmittedAt?: string | null;
  paymentConfirmedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  editHistory?: EditHistoryEntry[] | null;
  supplementaryProofs?: string[] | null;
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
export type Screen = 'search' | 'results' | 'map' | 'maps' | 'saved' | 'bookings' | 'profile';

/** Map / list / saved pill context above bottom nav (results flow). */
export type ResultsFlowPillContext = 'results' | 'map' | 'saved';

export interface SearchParams {
  query: string;
  date: string;
  duration: string;
  startHour?: number;
  period?: PeriodKey;
  lat?: number;
  lng?: number;
  radius?: number;
  sort: SortMode;
  limit?: number;
}
