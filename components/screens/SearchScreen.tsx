'use client';

import React from 'react';
import { SearchIcon } from '@/components/ui/Icons';
import BookHomeTopBar from '@/components/search/BookHomeTopBar';
import SearchFormFields from '@/components/search/SearchFormFields';
import type { ThemeTokens } from '@/lib/theme';

interface SearchScreenProps {
  searchQuery: string;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  userName: string;
  /** Total venues in DB (from /api/venues/count); shown next to the logo. */
  catalogVenueCount?: number | null;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  onSearch: () => void;
  onOpenProfile: () => void;
  t: ThemeTokens;
}

export default function SearchScreen({
  searchQuery, selectedDate, selectedDuration, selectedTime, userName, catalogVenueCount,
  onSearchQueryChange, onDateChange, onDurationChange, onTimeChange,
  onSearch, onOpenProfile, t,
}: SearchScreenProps) {
  return (
    <div style={{ minHeight: '100%', padding: '0 0 160px', animation: 'fadeIn 0.3s ease' }}>
      <BookHomeTopBar
        catalogVenueCount={catalogVenueCount}
        userName={userName}
        onOpenProfile={onOpenProfile}
        t={t}
      />

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
