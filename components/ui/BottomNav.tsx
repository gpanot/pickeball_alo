'use client';

import React from 'react';
import { SearchIcon, PinIcon, HeartIcon, CalendarIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { Screen } from '@/lib/types';

interface BottomNavProps {
  screen: Screen;
  onBook: () => void;
  onMaps: () => void;
  onSaved: () => void;
  onMyBookings: () => void;
  savedCount: number;
  t: ThemeTokens;
}

export default function BottomNav({ screen, onBook, onMaps, onSaved, onMyBookings, savedCount, t }: BottomNavProps) {
  const bookActive = screen === 'search' || screen === 'results' || screen === 'map';
  const mapsActive = screen === 'maps';
  const savedActive = screen === 'saved';
  const bookingsActive = screen === 'bookings';

  const item = (active: boolean) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '6px 4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: active ? t.accent : t.textSec,
  });

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 430,
        margin: '0 auto',
        zIndex: 5000,
        background: t.sheetBg,
        borderTop: `1px solid ${t.border}`,
        paddingTop: 6,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        boxShadow: `0 -4px 24px rgba(0,0,0,0.15)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
        <button type="button" onClick={onBook} style={item(bookActive)}>
          <span style={{ opacity: bookActive ? 1 : 0.7 }}>
            <SearchIcon size={22} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>Book</span>
        </button>
        <button type="button" onClick={onMaps} style={item(mapsActive)}>
          <span style={{ opacity: mapsActive ? 1 : 0.7 }}>
            <PinIcon size={22} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>Maps</span>
        </button>
        <button type="button" onClick={onSaved} style={{ ...item(savedActive), position: 'relative' }}>
          <span style={{ opacity: savedActive ? 1 : 0.7 }}>
            <HeartIcon size={22} fill={savedActive} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>Saved</span>
          {savedCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: '18%',
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: t.red,
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {savedCount > 99 ? '99+' : savedCount}
            </span>
          )}
        </button>
        <button type="button" onClick={onMyBookings} style={item(bookingsActive)}>
          <span style={{ opacity: bookingsActive ? 1 : 0.7 }}>
            <CalendarIcon size={22} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>My bookings</span>
        </button>
      </div>
    </nav>
  );
}
