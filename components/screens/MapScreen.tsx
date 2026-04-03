'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BookHomeTopBar from '@/components/search/BookHomeTopBar';
import MapsExploreSearch from '@/components/maps/MapsExploreSearch';
import ResultsSearchTopBar from '@/components/search/ResultsSearchTopBar';
import VenueCard from '@/components/venue/VenueCard';
import { LocateIcon } from '@/components/ui/Icons';
import { formatPrice, mapPriceTierFromVnd, type MapPriceTier } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, SortMode } from '@/lib/types';

/** Bounding box ~`radiusKm` from center (for “show N km around user”). */
function latLngBoundsAroundKm(lat: number, lng: number, radiusKm: number): L.LatLngBounds {
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusKm / 111.32;
  const cosLat = Math.cos(latRad);
  const dLng = cosLat > 0.01 ? radiusKm / (111.32 * cosLat) : radiusKm / 111.32;
  return L.latLngBounds([lat - dLat, lng - dLng], [lat + dLat, lng + dLng]);
}

interface MapScreenProps {
  venues: VenueResult[];
  savedIds: Set<string>;
  dark: boolean;
  sortBy: SortMode;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  searchQuery: string;
  onBack: () => void;
  onSort: (s: SortMode) => void;
  onToggleSaved: (id: string, e: React.MouseEvent) => void;
  onOpenVenue: (v: VenueResult) => void;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  onRefetchSearch: () => Promise<void>;
  t: ThemeTokens;
  /** If set, first fix and “locate” use fitBounds for this radius (km) around the user instead of street-level zoom. */
  userAreaRadiusKm?: number;
  /** Book flow shows List/Map floating pills above the nav; tab Maps does not — adjust overlay bottoms. */
  hasFlowPills?: boolean;
  /** Maps tab: same header as Book home (logo, catalog count, profile) — no search/sort/filters. */
  bookHomeTopBar?: boolean;
  catalogVenueCount?: number | null;
  userName?: string;
  onOpenProfile?: () => void;
}

/** Pill colors tuned for dark vs light map tiles; WCAG-friendly contrast on fills. */
function mapPillPalette(tier: MapPriceTier, mapDark: boolean): { bg: string; fg: string; ring: string } {
  if (mapDark) {
    switch (tier) {
      case 0:
        return { bg: '#14b8a6', fg: '#042f2e', ring: 'rgba(20,184,166,0.45)' };
      case 1:
        return { bg: '#f59e0b', fg: '#422006', ring: 'rgba(245,158,11,0.5)' };
      default:
        return { bg: '#a855f7', fg: '#faf5ff', ring: 'rgba(168,85,247,0.5)' };
    }
  }
  switch (tier) {
    case 0:
      return { bg: '#0f766e', fg: '#ecfdf5', ring: 'rgba(15,118,110,0.35)' };
    case 1:
      return { bg: '#b45309', fg: '#fffbeb', ring: 'rgba(180,83,9,0.35)' };
    default:
      return { bg: '#6d28d9', fg: '#f5f3ff', ring: 'rgba(109,40,217,0.35)' };
  }
}

export default function MapScreen({
  venues,
  savedIds,
  dark,
  sortBy,
  selectedDate,
  selectedDuration,
  selectedTime,
  searchQuery,
  onBack,
  onSort,
  onToggleSaved,
  onOpenVenue,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  onRefetchSearch,
  t,
  userAreaRadiusKm,
  hasFlowPills = true,
  bookHomeTopBar = false,
  catalogVenueCount,
  userName = '',
  onOpenProfile,
}: MapScreenProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  /** After a successful geolocation, keep map user-centric (do not fitBounds all venues). */
  const preferUserCenterRef = useRef(false);
  /** True until first geolocation attempt finishes — avoids fitBounds before we know user vs fallback. */
  const geoPendingRef = useRef(false);
  /** Only refit all-venue bounds when the venue list identity changes, not when selection updates. */
  const venuesBoundsSigRef = useRef('');
  const venuesRef = useRef(venues);
  venuesRef.current = venues;
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [geoWorking, setGeoWorking] = useState(false);

  const USER_ZOOM = 15;

  const applyUserView = useCallback(
    (map: L.Map, lat: number, lng: number, opts?: { animate?: boolean }) => {
      const animate = Boolean(opts?.animate);
      if (userAreaRadiusKm != null && userAreaRadiusKm > 0) {
        map.fitBounds(latLngBoundsAroundKm(lat, lng, userAreaRadiusKm), { padding: [28, 28], animate });
      } else {
        map.setView([lat, lng], USER_ZOOM, { animate });
      }
    },
    [userAreaRadiusKm],
  );

  const ensureUserMarker = useCallback((map: L.Map, lat: number, lng: number) => {
    const html = `<div style="
      background:#ea4335;
      color:#fff;
      font:800 10px/1 DM Sans,system-ui,sans-serif;
      padding:5px 10px;
      border-radius:8px;
      border:2px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.45);
      white-space:nowrap;
    ">You</div>`;
    const icon = L.divIcon({
      className: 'cm-user-marker',
      html,
      iconSize: [46, 28],
      iconAnchor: [23, 28],
    });
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 2500 }).addTo(map);
    }
  }, []);

  const fitVenueBoundsFromRef = (map: L.Map) => {
    const v = venuesRef.current;
    if (v.length === 0) return;
    map.fitBounds(L.latLngBounds(v.map((x) => L.latLng(x.lat, x.lng))), { padding: [40, 40] });
  };

  /** Google-style “my location” — does not depend on `venues` to avoid re-running on every search. */
  const recenterOnUser = useCallback(() => {
    const map = leafletMap.current;
    if (!map || !navigator.geolocation) return;
    setGeoWorking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoWorking(false);
        const m = leafletMap.current;
        if (!m) return;
        preferUserCenterRef.current = true;
        ensureUserMarker(m, pos.coords.latitude, pos.coords.longitude);
        applyUserView(m, pos.coords.latitude, pos.coords.longitude, { animate: true });
      },
      () => setGeoWorking(false),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, [applyUserView, ensureUserMarker]);

  const focusVenueFromExplore = useCallback((v: VenueResult) => {
    preferUserCenterRef.current = false;
    geoPendingRef.current = false;
    setSelectedVenue(v);
    const m = leafletMap.current;
    if (m) m.setView([v.lat, v.lng], 16, { animate: true });
  }, []);

  const focusPlaceFromExplore = useCallback((lat: number, lng: number) => {
    preferUserCenterRef.current = false;
    geoPendingRef.current = false;
    setSelectedVenue(null);
    const m = leafletMap.current;
    if (m) m.setView([lat, lng], 14, { animate: true });
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const initMap = () => {
      const map = L.map(mapRef.current!, {
        center: [10.79, 106.71],
        zoom: 12,
        zoomControl: false,
      });

      const tileUrl = dark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      leafletMap.current = map;
      setMapReady(true);
    };

    initMap();

    return () => {
      userMarkerRef.current = null;
      preferUserCenterRef.current = false;
      geoPendingRef.current = false;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;

    const map = leafletMap.current!;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const tileUrl = dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }, [dark, mapReady]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current) return;

    const map = leafletMap.current;

    const fitAll = () => fitVenueBoundsFromRef(map);

    if (!navigator.geolocation) {
      geoPendingRef.current = false;
      fitAll();
      return;
    }

    geoPendingRef.current = true;
    setGeoWorking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoPendingRef.current = false;
        setGeoWorking(false);
        const m = leafletMap.current;
        if (!m) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        preferUserCenterRef.current = true;
        ensureUserMarker(m, lat, lng);
        applyUserView(m, lat, lng, { animate: false });
      },
      () => {
        geoPendingRef.current = false;
        setGeoWorking(false);
        preferUserCenterRef.current = false;
        fitAll();
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, [mapReady, ensureUserMarker, applyUserView]);

  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;

    const map = leafletMap.current!;

    const boundsSig = venues.map((v) => v.id).join('\0');
    const venuesListChanged = boundsSig !== venuesBoundsSigRef.current;
    if (venuesListChanged) venuesBoundsSigRef.current = boundsSig;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    venues.forEach((v) => {
      const allSlots = v.courts.flatMap((c) => c.slots);
      const allBooked = allSlots.length > 0 && allSlots.every((s) => s.isBooked);
      const priceLabel = formatPrice(v.priceMin);
      const isSelected = selectedVenue?.id === v.id;
      const tier = mapPriceTierFromVnd(v.priceMin);
      const pal = allBooked
        ? { bg: dark ? '#3f3f46' : '#a1a1aa', fg: dark ? '#e4e4e7' : '#fafafa', ring: 'rgba(0,0,0,0.2)' }
        : mapPillPalette(tier, dark);

      // Teardrop pin like viewer.html: square + border-radius 50% 50% 50% 0, rotate -45deg; text counter-rotated, 4ch wide for "999k".
      const pin = 34;
      const pinBorder = dark ? '#000000' : '#0d0d0d';
      const shadow = isSelected
        ? `0 0 0 2px ${t.accent}, 0 2px 10px rgba(0,0,0,0.55)`
        : `0 2px 8px rgba(0,0,0,0.5)`;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
            width:${pin}px;
            height:${pin}px;
            background:${pal.bg};
            border:2px solid ${pinBorder};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:${shadow};
            display:flex;
            align-items:center;
            justify-content:center;
          "><span style="
            transform:rotate(45deg);
            color:${pal.fg};
            font:800 9px/1 DM Sans,system-ui,sans-serif;
            font-variant-numeric:tabular-nums;
            width:4ch;
            min-width:4ch;
            max-width:4ch;
            text-align:center;
            letter-spacing:-0.04em;
            white-space:nowrap;
            overflow:hidden;
          ">${priceLabel}</span></div>`,
        iconSize: [pin, pin],
        iconAnchor: [pin / 2, pin],
        popupAnchor: [0, -pin],
      });

      const marker = L.marker([v.lat, v.lng], { icon }).addTo(map);
      marker.on('click', () => setSelectedVenue(v));
      markersRef.current.push(marker);
    });

    if (
      venuesListChanged &&
      venues.length > 0 &&
      !preferUserCenterRef.current &&
      !geoPendingRef.current
    ) {
      map.fitBounds(L.latLngBounds(venues.map((v) => L.latLng(v.lat, v.lng))), { padding: [40, 40] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, selectedVenue, mapReady, dark, t.accent]);

  const overlayZ = 5100;
  const locateBottom = hasFlowPills
    ? 'max(118px, calc(102px + env(safe-area-inset-bottom)))'
    : 'max(88px, calc(72px + env(safe-area-inset-bottom)))';
  const cardBottom = hasFlowPills
    ? 'max(108px, calc(88px + env(safe-area-inset-bottom)))'
    : 'max(78px, calc(62px + env(safe-area-inset-bottom)))';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease', minHeight: 0 }}>
      <style>{`
        .leaflet-div-icon.cm-user-marker {
          border: none !important;
          background: transparent !important;
        }
      `}</style>
      {bookHomeTopBar ? (
        <>
          <BookHomeTopBar
            variant="map"
            catalogVenueCount={catalogVenueCount}
            userName={userName}
            onOpenProfile={onOpenProfile ?? (() => {})}
            t={t}
          />
          <MapsExploreSearch
            venues={venues}
            dark={dark}
            t={t}
            onPickVenue={focusVenueFromExplore}
            onPickPlace={focusPlaceFromExplore}
          />
        </>
      ) : (
        <ResultsSearchTopBar
          variant="map"
          venuesCount={venues.length}
          sortBy={sortBy}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          searchQuery={searchQuery}
          onBack={onBack}
          onSort={onSort}
          onSearchQueryChange={onSearchQueryChange}
          onDateChange={onDateChange}
          onDurationChange={onDurationChange}
          onTimeChange={onTimeChange}
          onRefetchSearch={onRefetchSearch}
          t={t}
        />
      )}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

        <button
          type="button"
          aria-label="Re-center map on your location"
          disabled={geoWorking}
          onClick={() => recenterOnUser()}
          style={{
            position: 'absolute',
            right: 12,
            bottom: locateBottom,
            zIndex: overlayZ,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `1px solid ${dark ? '#3f3f46' : '#e5e5e5'}`,
            background: dark ? '#262626' : '#fff',
            color: dark ? '#f4f4f5' : '#27272a',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            cursor: geoWorking ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: geoWorking ? 0.75 : 1,
          }}
        >
          <LocateIcon size={22} />
        </button>

        {selectedVenue && (
          <div
            style={{
              position: 'absolute',
              bottom: cardBottom,
              left: 12,
              right: 12,
              zIndex: overlayZ,
              animation: 'slideUp 0.25s ease',
              pointerEvents: 'auto',
            }}
          >
            <VenueCard
              venue={selectedVenue}
              compact
              isSaved={savedIds.has(selectedVenue.id)}
              onToggleSaved={onToggleSaved}
              onClick={() => onOpenVenue(selectedVenue)}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}
