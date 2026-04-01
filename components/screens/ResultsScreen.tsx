'use client';

import React from 'react';
import ResultsSearchTopBar from '@/components/search/ResultsSearchTopBar';
import VenueCard from '@/components/venue/VenueCard';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, SortMode } from '@/lib/types';

interface ResultsScreenProps {
  venues: VenueResult[];
  savedIds: Set<string>;
  sortBy: SortMode;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  searchQuery: string;
  loading: boolean;
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

export default function ResultsScreen({
  venues, savedIds, sortBy, selectedDate, selectedDuration, selectedTime,
  searchQuery, loading, onBack, onSort, onToggleSaved, onOpenVenue,
  onSearchQueryChange, onDateChange, onDurationChange, onTimeChange,
  onRefetchSearch, t,
}: ResultsScreenProps) {
  return (
    <div style={{ minHeight: '100%', animation: 'slideUp 0.35s ease', paddingBottom: 100 }}>
      <ResultsSearchTopBar
        variant="list"
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
      <div style={{ padding: '12px 16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textSec }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🏓</div>
            <div style={{ fontSize: 14 }}>Searching courts...</div>
          </div>
        ) : venues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textSec }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>No courts found</div>
            <div style={{ fontSize: 14 }}>Try adjusting your search criteria</div>
          </div>
        ) : (
          venues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              isSaved={savedIds.has(v.id)}
              onToggleSaved={onToggleSaved}
              onClick={() => onOpenVenue(v)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
