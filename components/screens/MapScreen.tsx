'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ResultsSearchTopBar from '@/components/search/ResultsSearchTopBar';
import VenueCard from '@/components/venue/VenueCard';
import { formatPrice, mapPriceTierFromVnd, type MapPriceTier } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, SortMode } from '@/lib/types';

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
}: MapScreenProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
    if (!leafletMap.current || !mapReady) return;

    const map = leafletMap.current!;

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

    if (venues.length > 0) {
      const bounds = L.latLngBounds(venues.map((v) => L.latLng(v.lat, v.lng)));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, selectedVenue, mapReady, dark, t.accent]);

  const overlayZ = 5100;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease', minHeight: 0 }}>
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
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

        {selectedVenue && (
          <div
            style={{
              position: 'absolute',
              bottom: 'max(108px, calc(88px + env(safe-area-inset-bottom)))',
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
