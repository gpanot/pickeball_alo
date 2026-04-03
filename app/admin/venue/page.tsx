'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { darkTheme } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders, withVenueQuery } from '@/lib/admin-api';

const t = darkTheme;

type VenueRow = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  hours: string | null;
  tags: string[];
  amenities: string[];
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  googleUrl: string | null;
  rating: number | null;
  reviewCount: number;
  lat?: number | null;
  lng?: number | null;
};

function formatCoord(n: number | null | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(5) : '—';
}

export default function AdminVenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [v, setV] = useState<VenueRow | null>(null);
  const [tagsStr, setTagsStr] = useState('');
  const [amenStr, setAmenStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const s = readAdminSession();
    if (!s) {
      router.replace('/admin');
      return;
    }
    fetch(withVenueQuery('/api/admin/venue', s.venueId), {
      headers: adminAuthHeaders(s.token),
    })
      .then((r) => {
        if (r.status === 401) {
          clearAdminSession();
          router.replace('/admin');
          return null;
        }
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((row: VenueRow | null) => {
        if (!row) return;
        setV(row);
        setTagsStr(row.tags?.join(', ') ?? '');
        setAmenStr(row.amenities?.join(', ') ?? '');
      })
      .catch(() => setV(null))
      .finally(() => setLoading(false));
  }, [router]);

  const save = async () => {
    const s = readAdminSession();
    if (!s || !v) return;
    setSaving(true);
    setMsg('');
    try {
      const tags = tagsStr
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      const amenities = amenStr
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      const res = await fetch(withVenueQuery('/api/admin/venue', s.venueId), {
        method: 'PUT',
        headers: adminAuthHeaders(s.token),
        body: JSON.stringify({
          name: v.name,
          address: v.address,
          phone: v.phone,
          hours: v.hours,
          tags,
          amenities,
          facebookUrl: v.facebookUrl,
          instagramUrl: v.instagramUrl,
          tiktokUrl: v.tiktokUrl,
          googleUrl: v.googleUrl,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setV(updated);
      setMsg('Saved');
    } catch {
      setMsg('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: t.textSec }}>Loading venue…</div>;
  }

  if (!v) {
    return <div style={{ color: t.red }}>Could not load venue data.</div>;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    background: t.bgInput,
    color: t.text,
    fontSize: 16,
    fontFamily: 'inherit',
    marginBottom: 16,
    WebkitAppearance: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: t.textSec,
    marginBottom: 6,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/admin/courts" style={{ color: t.blue, fontSize: 14, fontWeight: 600 }}>
          Courts & pricing →
        </Link>
      </div>
      <h1 style={{ margin: '0 0 20px', fontSize: 22 }}>Venue settings</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: t.textSec }}>
        Member pricing and time-band tables are edited under <strong style={{ color: t.text }}>Courts</strong>.
      </p>

      <label style={labelStyle}>Venue name</label>
      <input style={inputStyle} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />

      <label style={labelStyle}>Address</label>
      <textarea
        style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
        value={v.address}
        onChange={(e) => setV({ ...v, address: e.target.value })}
        placeholder="Paste full address from Google Maps…"
      />

      <label style={labelStyle}>Phone</label>
      <input
        type="tel"
        style={inputStyle}
        value={v.phone ?? ''}
        onChange={(e) => setV({ ...v, phone: e.target.value || null })}
      />

      <label style={labelStyle}>Operating hours</label>
      <input
        style={inputStyle}
        value={v.hours ?? ''}
        onChange={(e) => setV({ ...v, hours: e.target.value || null })}
        placeholder="5:00 AM - 10:00 PM"
      />

      <label style={labelStyle}>Tags (comma-separated)</label>
      <input
        style={inputStyle}
        value={tagsStr}
        onChange={(e) => setTagsStr(e.target.value)}
        placeholder="Indoor, Outdoor, AC, Lights"
      />

      <label style={labelStyle}>Amenities (comma-separated)</label>
      <input style={inputStyle} value={amenStr} onChange={(e) => setAmenStr(e.target.value)} />

      <label style={labelStyle}>Facebook URL</label>
      <input
        type="url"
        style={inputStyle}
        value={v.facebookUrl ?? ''}
        onChange={(e) => setV({ ...v, facebookUrl: e.target.value || null })}
      />

      <label style={labelStyle}>Instagram URL</label>
      <input
        type="url"
        style={inputStyle}
        value={v.instagramUrl ?? ''}
        onChange={(e) => setV({ ...v, instagramUrl: e.target.value || null })}
      />

      <label style={labelStyle}>TikTok URL</label>
      <input
        type="url"
        style={inputStyle}
        value={v.tiktokUrl ?? ''}
        onChange={(e) => setV({ ...v, tiktokUrl: e.target.value || null })}
      />

      <label style={labelStyle}>Google Maps URL</label>
      <input
        type="url"
        style={inputStyle}
        value={v.googleUrl ?? ''}
        onChange={(e) => setV({ ...v, googleUrl: e.target.value || null })}
      />

      <div
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>Read-only</div>
        <div style={{ fontSize: 14, color: t.textSec }}>
          Rating: {v.rating ?? '—'} ({v.reviewCount ?? 0} reviews)
        </div>
        <div style={{ fontSize: 14, color: t.textSec, marginTop: 6 }}>
          Lat {formatCoord(v.lat)}, Lng {formatCoord(v.lng)}
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
          Coordinates update when you change the address and save.
        </div>
      </div>

      {msg ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: msg === 'Saved' ? `${t.green}18` : `${t.red}18`,
            color: msg === 'Saved' ? t.green : t.red,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {msg}
        </div>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 16,
          borderRadius: 12,
          border: 'none',
          background: t.blue,
          color: '#fff',
          fontSize: 16,
          fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
