'use client';

import React, { useState, useEffect } from 'react';
import { BackIcon, SunIcon, MoonIcon, CalendarIcon, HeartIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { Screen } from '@/lib/types';

interface ProfileScreenProps {
  dark: boolean;
  userName: string;
  userPhone: string;
  onBack: () => void;
  onSave: (name: string, phone: string) => void;
  onToggleDark: () => void;
  onNavigate: (s: Screen) => void;
  t: ThemeTokens;
}

export default function ProfileScreen({ dark, userName, userPhone, onBack, onSave, onToggleDark, onNavigate, t }: ProfileScreenProps) {
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(userName);
    setPhone(userPhone);
  }, [userName, userPhone]);

  const handleSave = () => {
    onSave(name.trim(), phone.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    background: t.bgInput, border: `1px solid ${t.border}`,
    color: t.text, fontSize: 15, fontFamily: 'inherit', outline: 'none',
  };

  const linkStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderRadius: 14, background: t.bgCard,
    border: `1px solid ${t.border}`, cursor: 'pointer',
    transition: 'all 0.15s', textDecoration: 'none',
  };

  return (
    <div style={{ minHeight: '100%', animation: 'fadeIn 0.3s ease', paddingBottom: 88 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: t.bg,
        borderBottom: `1px solid ${t.border}`, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <BackIcon />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Profile</div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Avatar placeholder */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: t.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 32, border: `2px solid ${t.accent}`,
        }}>
          🏓
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>
              Name
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>
              Phone
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" style={inputStyle} />
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 14,
            background: t.accent, color: '#000', fontWeight: 800, fontSize: 15,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: 24, boxShadow: `0 4px 20px ${t.accent}55`,
          }}
        >
          {saved ? '✓ SAVED' : 'SAVE'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div onClick={() => onNavigate('bookings')} style={linkStyle}>
            <span style={{ color: t.accent }}><CalendarIcon /></span>
            <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>My Bookings</span>
          </div>
          <div onClick={() => onNavigate('saved')} style={linkStyle}>
            <span style={{ color: t.accent }}><HeartIcon /></span>
            <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Saved Courts</span>
          </div>
          <div onClick={onToggleDark} style={linkStyle}>
            <span style={{ color: t.accent }}>{dark ? <SunIcon /> : <MoonIcon />}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{dark ? 'Light mode' : 'Dark mode'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
