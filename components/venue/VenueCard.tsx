'use client';

import React from 'react';
import { HeartIcon, StarIcon, PinIcon, CourtIcon } from '@/components/ui/Icons';
import { formatPrice } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';

interface VenueCardProps {
  venue: VenueResult;
  compact?: boolean;
  isSaved: boolean;
  onToggleSaved: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
  /** Shown on list cards only; opens confirm booking when `onBookClick` is set. */
  bookButtonLabel?: string;
  onBookClick?: (e: React.MouseEvent) => void;
  /** Compact accent pill (e.g. Saved list → edit search). */
  bookPill?: boolean;
  onBookPillClick?: (e: React.MouseEvent) => void;
  t: ThemeTokens;
}

export default function VenueCard({
  venue,
  compact,
  isSaved,
  onToggleSaved,
  onClick,
  bookButtonLabel,
  onBookClick,
  bookPill,
  onBookPillClick,
  t,
}: VenueCardProps) {
  const allSlots = venue.courts.flatMap((c) => c.slots);
  const allBooked = allSlots.length > 0 && allSlots.every((s) => s.isBooked);

  return (
    <div
      onClick={onClick}
      style={{
        background: t.bgCard, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${t.border}`, cursor: 'pointer',
        transition: 'all 0.2s', ...(compact ? {} : { marginBottom: 12 }),
      }}
    >
      <div style={{
        height: compact ? 100 : 140,
        background: `linear-gradient(135deg,${t.bgSurface},${t.bgInput})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 32 : 44, position: 'relative',
      }}>
        🏓
        <button
          onClick={(e) => onToggleSaved(venue.id, e)}
          style={{
            position: 'absolute', top: 8, right: 8, width: 34, height: 34,
            borderRadius: '50%', background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isSaved ? t.red : '#fff',
          }}
        >
          <HeartIcon fill={isSaved} />
        </button>
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          background: t.accent, color: '#000', fontWeight: 700,
          fontSize: 13, padding: '4px 10px', borderRadius: 8,
        }}>
          {formatPrice(venue.priceMin)}/h
        </div>
        {allBooked && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: t.red, color: '#fff', fontWeight: 700,
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
          }}>
            Fully booked
          </div>
        )}
      </div>
      <div style={{ padding: compact ? '10px 12px' : '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: compact ? 14 : 16, color: t.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {venue.name}
            </div>
            <div style={{
              fontSize: 12, color: t.textSec, marginTop: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {venue.address}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: t.accentBg, padding: '4px 8px', borderRadius: 8, flexShrink: 0,
          }}>
            <span style={{ color: t.accent }}><StarIcon /></span>
            <span style={{ fontWeight: 700, fontSize: 13, color: t.text }}>{venue.rating}</span>
            <span style={{ fontSize: 11, color: t.textSec }}>({venue.reviewCount})</span>
          </div>
        </div>
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.textSec }}>
                <PinIcon /> {venue.distance ?? '—'} km
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.textSec }}>
                <CourtIcon /> {venue.courts.length} courts
              </span>
            </div>
            {bookPill && onBookPillClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookPillClick(e);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.2,
                  background: t.accent,
                  color: '#000',
                  flexShrink: 0,
                  boxShadow: `0 2px 10px ${t.accent}44`,
                }}
              >
                Book
              </button>
            )}
          </div>
        )}
        {!compact && venue.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {venue.tags.slice(0, 4).map((tag) => (
              <span key={tag} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                background: t.accentBg, color: t.accent, fontWeight: 600,
                border: `1px solid ${t.accentBgStrong}`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {!compact && bookButtonLabel && onBookClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBookClick(e);
            }}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              fontFamily: 'inherit',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              background: t.accent,
              color: '#000',
              boxShadow: `0 4px 16px ${t.accent}44`,
            }}
          >
            Book {bookButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
