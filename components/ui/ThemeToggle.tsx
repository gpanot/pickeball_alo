'use client';

import React from 'react';
import { SunIcon, MoonIcon } from './Icons';
import type { ThemeTokens } from '@/lib/theme';

interface ThemeToggleProps {
  dark: boolean;
  onToggle: () => void;
  t: ThemeTokens;
}

export default function ThemeToggle({ dark, onToggle, t }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 5200,
        width: 40, height: 40, borderRadius: '50%',
        background: t.bgCard, border: `1px solid ${t.border}`,
        color: t.text, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: t.shadowSm,
      }}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
