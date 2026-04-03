'use client';

import React from 'react';
import { BackIcon } from '@/components/ui/Icons';
import VenueCard from '@/components/venue/VenueCard';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';

interface SavedScreenProps {
  venues: VenueResult[];
  savedIds: Set<string>;
  onBack: () => void;
  onToggleSaved: (id: string, e: React.MouseEvent) => void;
  onOpenVenue: (v: VenueResult) => void;
  /** Book pill: open when/where sheet, then primary action opens this venue’s detail with those picks. */
  onOpenBookSearch: (venue: VenueResult) => void;
  /** Extra bottom padding when Map/Saved pills are shown (results flow) */
  bottomInsetForPills?: boolean;
  t: ThemeTokens;
}

export default function SavedScreen({ venues, savedIds, onBack, onToggleSaved, onOpenVenue, onOpenBookSearch, bottomInsetForPills, t }: SavedScreenProps) {
  const savedVenues = venues.filter((v) => savedIds.has(v.id));
  const pb = bottomInsetForPills ? 100 : 88;

  return (
    <div style={{ minHeight: '100%', animation: 'fadeIn 0.3s ease', paddingBottom: pb }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: t.bg,
        borderBottom: `1px solid ${t.border}`, padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4 }}>
          <BackIcon />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Saved Courts</div>
        <div style={{ width: 30 }} />
      </div>
      <div style={{ padding: '12px 16px 24px' }}>
        {savedVenues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textSec }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>No saved courts yet</div>
            <div style={{ fontSize: 14 }}>Tap the heart on any court to save it here</div>
          </div>
        ) : (
          savedVenues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              isSaved={true}
              onToggleSaved={onToggleSaved}
              onClick={() => onOpenVenue(v)}
              bookPill
              onBookPillClick={() => onOpenBookSearch(v)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
