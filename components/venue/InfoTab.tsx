'use client';

import React from 'react';
import { ClockIcon, PhoneIcon, PinIcon, FacebookIcon, InstagramIcon, TikTokIcon, GoogleIcon } from '@/components/ui/Icons';
import { AMENITY_ICONS } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';

interface InfoTabProps {
  venue: VenueResult;
  t: ThemeTokens;
}

export default function InfoTab({ venue, t }: InfoTabProps) {
  const socialLinks = [
    { url: venue.facebookUrl, icon: FacebookIcon, label: 'Facebook' },
    { url: venue.instagramUrl, icon: InstagramIcon, label: 'Instagram' },
    { url: venue.tiktokUrl, icon: TikTokIcon, label: 'TikTok' },
    { url: venue.googleUrl, icon: GoogleIcon, label: 'Google Maps' },
  ].filter((l) => l.url);

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ marginBottom: 20 }}>
        {venue.hours && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: t.accent }}><ClockIcon /></span>
            <span style={{ fontSize: 14, color: t.text, fontWeight: 600 }}>{venue.hours}</span>
          </div>
        )}
        {venue.phone && (
          <a href={`tel:${venue.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, textDecoration: 'none' }}>
            <span style={{ color: t.accent }}><PhoneIcon /></span>
            <span style={{ fontSize: 14, color: t.text, fontWeight: 600 }}>{venue.phone}</span>
          </a>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: t.accent }}><PinIcon /></span>
          <span style={{ fontSize: 14, color: t.text }}>{venue.address}</span>
        </div>
      </div>

      {socialLinks.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.url!}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: t.bgCard, border: `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textSec, textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              <link.icon />
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.textMuted, marginBottom: 12 }}>
        Amenities
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {venue.amenities.map((a) => (
          <div key={a} style={{
            padding: '12px 8px', borderRadius: 12, background: t.bgCard,
            textAlign: 'center', border: `1px solid ${t.border}`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{AMENITY_ICONS[a] || '✨'}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{a}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 20 }}>
        {venue.tags.map((tag) => (
          <span key={tag} style={{
            fontSize: 12, padding: '6px 14px', borderRadius: 20,
            background: t.accentBg, color: t.accent, fontWeight: 600,
            border: `1px solid ${t.accentBgStrong}`,
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
