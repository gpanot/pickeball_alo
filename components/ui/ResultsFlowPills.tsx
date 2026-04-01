'use client';

import React from 'react';
import { PinIcon, HeartIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';

export type ResultsFlowPillContext = 'results' | 'map' | 'saved';

interface ResultsFlowPillsProps {
  context: ResultsFlowPillContext;
  savedCount: number;
  onPrimary: () => void;
  onSaved: () => void;
  t: ThemeTokens;
}

export default function ResultsFlowPills({ context, savedCount, onPrimary, onSaved, t }: ResultsFlowPillsProps) {
  const mapOrListActive = context === 'map';
  const savedActive = context === 'saved';

  const primaryLabel = context === 'map' ? 'List' : 'Map';
  const PrimaryIcon = PinIcon;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        zIndex: 5000,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        onClick={onPrimary}
        style={{
          padding: '12px 24px',
          borderRadius: 50,
          background: mapOrListActive ? t.accent : t.pillBg,
          color: mapOrListActive ? '#000' : t.text,
          border: mapOrListActive ? 'none' : `1px solid ${t.pillBorder}`,
          backdropFilter: 'blur(12px)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: t.shadow,
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <PrimaryIcon /> {primaryLabel}
      </button>
      <button
        type="button"
        onClick={onSaved}
        style={{
          padding: '12px 24px',
          borderRadius: 50,
          background: savedActive ? t.accent : t.pillBg,
          color: savedActive ? '#000' : t.text,
          border: savedActive ? 'none' : `1px solid ${t.pillBorder}`,
          backdropFilter: 'blur(12px)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: t.shadow,
          transition: 'all 0.2s',
          fontFamily: 'inherit',
          position: 'relative',
        }}
      >
        <HeartIcon fill={savedActive} /> Saved
        {savedCount > 0 && !savedActive && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              borderRadius: '50%',
              background: t.red,
              color: '#fff',
              fontSize: 11,
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
    </div>
  );
}
