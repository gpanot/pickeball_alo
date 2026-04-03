'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PinIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';
import { suggestMapPlaces } from '@/lib/map-places-suggest';

interface MapsExploreSearchProps {
  venues: VenueResult[];
  dark: boolean;
  t: ThemeTokens;
  onPickVenue: (v: VenueResult) => void;
  onPickPlace: (lat: number, lng: number) => void;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export default function MapsExploreSearch({ venues, dark, t, onPickVenue, onPickPlace }: MapsExploreSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placeHits, setPlaceHits] = useState<Array<{ displayName: string; lat: number; lng: number }>>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const venueHits = useMemo(() => {
    const n = normalize(query);
    if (n.length < 1) return [];
    return venues
      .filter((v) => normalize(v.name).includes(n) || normalize(v.address).includes(n))
      .slice(0, 8);
  }, [venues, query]);

  useEffect(() => {
    const n = query.trim();
    if (n.length < 2) {
      setPlaceHits([]);
      setPlacesLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const id = ++requestIdRef.current;
      setPlacesLoading(true);
      void suggestMapPlaces(n).then((rows) => {
        if (requestIdRef.current !== id) return;
        setPlaceHits(rows);
        setPlacesLoading(false);
      });
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el || !open) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown, true);
    return () => document.removeEventListener('mousedown', onDocDown, true);
  }, [open]);

  const showPanel = open && (venueHits.length > 0 || placeHits.length > 0 || placesLoading);

  const handleVenuePick = useCallback(
    (v: VenueResult) => {
      onPickVenue(v);
      setQuery('');
      setOpen(false);
      setPlaceHits([]);
    },
    [onPickVenue],
  );

  const handlePlacePick = useCallback(
    (lat: number, lng: number) => {
      onPickPlace(lat, lng);
      setQuery('');
      setOpen(false);
      setPlaceHits([]);
    },
    [onPickPlace],
  );

  const barBg = dark ? '#121212' : t.bgInput;
  const barBorder = t.border;

  return (
    <div ref={wrapRef} style={{ flexShrink: 0, padding: '0 16px 12px', background: t.bg, borderBottom: `1px solid ${t.border}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 999,
          background: barBg,
          border: `1px solid ${barBorder}`,
        }}
      >
        <span style={{ color: t.accent, display: 'flex', flexShrink: 0 }} aria-hidden>
          <PinIcon size={20} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search area or venue name..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search area or venue name"
          aria-expanded={showPanel}
          aria-controls="maps-explore-suggest"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            color: t.text,
            fontSize: 15,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      {showPanel && (
        <div
          id="maps-explore-suggest"
          role="listbox"
          style={{
            marginTop: 8,
            maxHeight: 'min(42vh, 320px)',
            overflowY: 'auto',
            borderRadius: 12,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowSm,
          }}
        >
          {venueHits.length > 0 && (
            <>
              <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 800, letterSpacing: 1, color: t.textMuted }}>
                VENUES
              </div>
              {venueHits.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="option"
                  onClick={() => handleVenuePick(v)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderTop: `1px solid ${t.border}`,
                    background: 'transparent',
                    color: t.text,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>{v.address}</div>
                </button>
              ))}
            </>
          )}

          {(placesLoading || placeHits.length > 0) && (
            <>
              <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 800, letterSpacing: 1, color: t.textMuted }}>
                PLACES
              </div>
              {placesLoading && placeHits.length === 0 && (
                <div style={{ padding: '12px 14px', color: t.textSec, fontSize: 13 }}>Searching…</div>
              )}
              {placeHits.map((p, i) => (
                <button
                  key={`${p.lat},${p.lng},${i}`}
                  type="button"
                  role="option"
                  onClick={() => handlePlacePick(p.lat, p.lng)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderTop: `1px solid ${t.border}`,
                    background: 'transparent',
                    color: t.text,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {p.displayName}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
