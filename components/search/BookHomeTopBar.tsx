'use client';

import React from 'react';
import type { ThemeTokens } from '@/lib/theme';

export interface BookHomeTopBarProps {
  catalogVenueCount?: number | null;
  userName: string;
  onOpenProfile: () => void;
  t: ThemeTokens;
  /** `book`: sticky (Search screen). `map`: flex header above map. */
  variant?: 'book' | 'map';
}

function profileInitial(name: string): string {
  const s = name.trim();
  if (!s) return '?';
  return s.charAt(0).toUpperCase();
}

export default function BookHomeTopBar({
  catalogVenueCount,
  userName,
  onOpenProfile,
  t,
  variant = 'book',
}: BookHomeTopBarProps) {
  const positionStyle: React.CSSProperties =
    variant === 'map'
      ? { flexShrink: 0, zIndex: 60, position: 'relative' }
      : { position: 'sticky', top: 0, zIndex: 60 };

  return (
    <div
      style={{
        ...positionStyle,
        background: t.bg,
        borderBottom: `1px solid ${t.border}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ fontFamily: "'Archivo Black','Impact',sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: t.text }}>
          <span style={{ color: t.accent }}>COURT</span>MAP
        </div>
        {catalogVenueCount != null && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: t.textMuted, whiteSpace: 'nowrap' }}>
            VENUES {catalogVenueCount}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Open profile"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: t.accentBgStrong,
          border: `2px solid ${t.accent}`,
          color: t.accent,
          fontWeight: 800,
          fontSize: 16,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {profileInitial(userName)}
      </button>
    </div>
  );
}
