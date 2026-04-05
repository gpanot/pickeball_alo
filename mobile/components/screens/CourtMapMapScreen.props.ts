import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, SortMode } from '@/lib/types';

export interface CourtMapMapScreenProps {
  venues: VenueResult[];
  savedIds: Set<string>;
  sortBy: SortMode;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  searchQuery: string;
  onBack: () => void;
  onSort: (s: SortMode) => void;
  onToggleSaved: (id: string) => void;
  onOpenVenue: (v: VenueResult) => void;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  onRefetchSearch: () => Promise<void>;
  t: ThemeTokens;
  userAreaRadiusKm?: number;
  hasFlowPills?: boolean;
  bookHomeTopBar?: boolean;
  catalogVenueCount?: number | null;
  userName?: string;
  onOpenProfile?: () => void;
  /** Maps tab only: load venues by map center + radius (nearby first, wider when zoomed out). */
  exploreMapFetch?: (opts: { lat: number; lng: number; radiusKm: number; reason: string }) => void;
  /** Cached user location from context (survives tab switches). */
  initialUserLoc?: { lat: number; lng: number } | null;
  /** Callback to persist user location into context. */
  onUserLocResolved?: (loc: { lat: number; lng: number }) => void;
  /** Whether initial geolocation was already done (skip re-init on remount). */
  geoInitDone?: boolean;
  /** Mark geo init as done in context. */
  onGeoInitDone?: () => void;
}
