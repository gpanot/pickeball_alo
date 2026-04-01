'use client';

import React from 'react';
import { SearchIcon } from '@/components/ui/Icons';
import SearchFormFields from '@/components/search/SearchFormFields';
import type { ThemeTokens } from '@/lib/theme';

interface SearchScreenProps {
  searchQuery: string;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  userName: string;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  onSearch: () => void;
  onOpenProfile: () => void;
  t: ThemeTokens;
}

function profileInitial(name: string): string {
  const s = name.trim();
  if (!s) return '?';
  return s.charAt(0).toUpperCase();
}

export default function SearchScreen({
  searchQuery, selectedDate, selectedDuration, selectedTime, userName,
  onSearchQueryChange, onDateChange, onDurationChange, onTimeChange,
  onSearch, onOpenProfile, t,
}: SearchScreenProps) {
  return (
    <div style={{ minHeight: '100%', padding: '0 0 160px', animation: 'fadeIn 0.3s ease' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontFamily: "'Archivo Black','Impact',sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: t.text }}>
          <span style={{ color: t.accent }}>COURT</span>MAP
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

      <div style={{ padding: '8px 20px 0', background: `linear-gradient(180deg,${t.accentBg} 0%,transparent 85%)` }} />
      <div style={{ padding: '0 20px' }}>
        <SearchFormFields
          t={t}
          searchQuery={searchQuery}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          onSearchQueryChange={onSearchQueryChange}
          onDateChange={onDateChange}
          onDurationChange={onDurationChange}
          onTimeChange={onTimeChange}
        />
      </div>

      <div style={{
        position: 'fixed',
        bottom: 'max(72px, calc(60px + env(safe-area-inset-bottom)))',
        left: 0,
        right: 0,
        maxWidth: 430,
        margin: '0 auto',
        padding: '0 20px',
        zIndex: 4900,
        background: `linear-gradient(transparent,${t.bg} 35%)`,
        paddingTop: 16,
      }}>
        <button
          type="button"
          onClick={onSearch}
          style={{
            width: '100%', padding: '16px 20px', borderRadius: 14,
            background: t.accent, color: '#000', fontWeight: 800, fontSize: 16,
            border: 'none', cursor: 'pointer', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: `0 4px 20px ${t.accent}55`, fontFamily: 'inherit',
          }}
        >
          <SearchIcon /> SEARCH COURTS
        </button>
      </div>
    </div>
  );
}
