'use client';

import React from 'react';
import { CourtIcon, SearchIcon } from '@/components/ui/Icons';
import SearchFormFields from '@/components/search/SearchFormFields';
import { getBookTimeShortLabel } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { SearchFormFieldsProps } from '@/components/search/SearchFormFields';

type FieldsProps = Omit<SearchFormFieldsProps, 't'>;

interface SearchCriteriaSheetProps extends FieldsProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  applying?: boolean;
  t: ThemeTokens;
  /** Saved “Book” flow: different title and primary CTA (Book for …). */
  bookAtVenueName?: string | null;
}

export default function SearchCriteriaSheet({
  open,
  onClose,
  onApply,
  applying,
  t,
  bookAtVenueName = null,
  searchQuery,
  selectedDate,
  selectedDuration,
  selectedTime,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
}: SearchCriteriaSheetProps) {
  if (!open) return null;

  const bookFlow = Boolean(bookAtVenueName);
  const bookTimePhrase = getBookTimeShortLabel(selectedTime);
  const primaryLabel = bookFlow
    ? (bookTimePhrase ? `Book for ${bookTimePhrase}` : 'Book court')
    : 'UPDATE SEARCH';

  return (
    <>
      <button
        type="button"
        aria-label="Close search editor"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 5500,
          background: t.overlay,
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: 430,
          margin: '0 auto',
          zIndex: 5501,
          maxHeight: '88vh',
          background: t.sheetBg,
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <style>{`
          @keyframes slideUpSheet {
            from { transform: translateY(100%); opacity: 0.9; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.textMuted, opacity: 0.45 }} />
        </div>
        <div style={{ padding: '0 20px 8px', borderBottom: `1px solid ${t.border}` }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text }}>
            {bookFlow ? `Book · ${bookAtVenueName}` : 'Edit search'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: t.textSec }}>
            {bookFlow
              ? 'Choose date, duration, and start time for this court.'
              : 'Update filters and search again'}
          </p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
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
        <div
          style={{
            padding: '12px 20px max(16px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${t.border}`,
            background: t.sheetBg,
          }}
        >
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 14,
              background: t.accent,
              color: '#000',
              fontWeight: 800,
              fontSize: 15,
              border: 'none',
              cursor: applying ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: `0 4px 20px ${t.accent}55`,
              opacity: applying ? 0.75 : 1,
            }}
          >
            {bookFlow ? <CourtIcon size={18} /> : <SearchIcon size={18} />}
            {applying ? (bookFlow ? 'OPENING…' : 'SEARCHING…') : primaryLabel}
          </button>
        </div>
      </div>
    </>
  );
}
