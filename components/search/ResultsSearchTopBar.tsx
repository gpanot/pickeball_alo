'use client';

import React, { useState, useCallback } from 'react';
import { BackIcon } from '@/components/ui/Icons';
import SearchCriteriaSheet from '@/components/search/SearchCriteriaSheet';
import { DURATIONS, getNextDays, formatDateLabel, getStartHourLabel } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { SortMode } from '@/lib/types';

function miniChip(theme: ThemeTokens, active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 20, border: 'none',
    background: active ? theme.accentBgStrong : theme.bgCard,
    color: active ? theme.accent : theme.textSec,
    fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
    outline: `1px solid ${active ? theme.accent : theme.border}`,
    transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
  };
}

export interface ResultsSearchTopBarProps {
  venuesCount: number;
  sortBy: SortMode;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  searchQuery: string;
  onBack: () => void;
  onSort: (s: SortMode) => void;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  onRefetchSearch: () => Promise<void>;
  t: ThemeTokens;
  /** list: sticky under scroll; map: fixed block above map */
  variant?: 'list' | 'map';
}

export default function ResultsSearchTopBar({
  venuesCount,
  sortBy,
  selectedDate,
  selectedDuration,
  selectedTime,
  searchQuery,
  onBack,
  onSort,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  onRefetchSearch,
  t,
  variant = 'list',
}: ResultsSearchTopBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const dates = getNextDays(7);
  const dateLabel = selectedDate < dates.length ? formatDateLabel(dates[selectedDate]).date : '';

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      await onRefetchSearch();
      setSheetOpen(false);
    } finally {
      setApplying(false);
    }
  }, [onRefetchSearch]);

  const positionStyle: React.CSSProperties =
    variant === 'list'
      ? { position: 'sticky', top: 0, zIndex: 50 }
      : { flexShrink: 0, zIndex: 10, position: 'relative' as const };

  return (
    <>
      <div
        style={{
          ...positionStyle,
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
          padding: '12px 16px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4, display: 'flex', width: 40, flexShrink: 0 }}>
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontFamily: 'inherit',
              margin: '0 4px',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
              {dateLabel} · {DURATIONS[selectedDuration]} · {getStartHourLabel(selectedTime)}
            </div>
            <div style={{ fontSize: 12, color: t.textSec }}>{venuesCount} courts found</div>
          </button>
          <div style={{ width: 40, flexShrink: 0 }} aria-hidden />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {([['distance', 'Nearest'], ['price', 'Cheapest'], ['rating', 'Top rated']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => onSort(key)} style={miniChip(t, sortBy === key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <SearchCriteriaSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={handleApply}
        applying={applying}
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
    </>
  );
}
