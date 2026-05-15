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
    if (!s) { router.replace('/admin'); return; }
    fetch(withVenueQuery('/api/admin/venue', s.venueId), { headers: adminAuthHeaders(s.token) })
      .then((r) => {
        if (r.status === 401) { clearAdminSession(); router.replace('/admin'); return null; }
        if (!r.ok) throw new Error();
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
      const tags = tagsStr.split(',').map((x) => x.trim()).filter(Boolean);
      const amenities = amenStr.split(',').map((x) => x.trim()).filter(Boolean);
      const res = await fetch(withVenueQuery('/api/admin/venue', s.venueId), {
        method: 'PUT',
        headers: adminAuthHeaders(s.token),
        body: JSON.stringify({ name: v.name, address: v.address, phone: v.phone, hours: v.hours, tags, amenities, facebookUrl: v.facebookUrl, instagramUrl: v.instagramUrl, tiktokUrl: v.tiktokUrl, googleUrl: v.googleUrl }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setV(updated);
      setMsg('Saved');
    } catch { setMsg('Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: t.textSec }}>Loading…</div>;
  if (!v) return <div style={{ color: t.red }}>Could not load venue data.</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Venue settings</h1>
        <Link href="/admin/courts" style={{ color: t.blue, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Courts & pricing →</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* Left column: core info */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Basic info</div>

          <Row label="Venue name">
            <input style={inp} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Row>
          <Row label="Address">
            <textarea style={{ ...inp, minHeight: 48, resize: 'vertical' }} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Row label="Phone">
              <input type="tel" style={inp} value={v.phone ?? ''} onChange={(e) => setV({ ...v, phone: e.target.value || null })} />
            </Row>
            <Row label="Hours">
              <input style={inp} value={v.hours ?? ''} onChange={(e) => setV({ ...v, hours: e.target.value || null })} placeholder="5AM - 10PM" />
            </Row>
          </div>
          <Row label="Tags (comma-separated)">
            <input style={inp} value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="Indoor, Outdoor, AC" />
          </Row>
          <Row label="Amenities (comma-separated)">
            <input style={inp} value={amenStr} onChange={(e) => setAmenStr(e.target.value)} placeholder="Parking, Water, Lights" />
          </Row>
        </div>

        {/* Right column: links + read-only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Social links</div>
            <Row label="Facebook">
              <input type="url" style={inp} value={v.facebookUrl ?? ''} onChange={(e) => setV({ ...v, facebookUrl: e.target.value || null })} />
            </Row>
            <Row label="Instagram">
              <input type="url" style={inp} value={v.instagramUrl ?? ''} onChange={(e) => setV({ ...v, instagramUrl: e.target.value || null })} />
            </Row>
            <Row label="TikTok">
              <input type="url" style={inp} value={v.tiktokUrl ?? ''} onChange={(e) => setV({ ...v, tiktokUrl: e.target.value || null })} />
            </Row>
            <Row label="Google Maps">
              <input type="url" style={inp} value={v.googleUrl ?? ''} onChange={(e) => setV({ ...v, googleUrl: e.target.value || null })} />
            </Row>
          </div>

          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 }}>Read-only</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 13, color: t.textSec }}>
              <span>Rating</span>
              <span style={{ color: t.text, fontWeight: 600 }}>{v.rating ?? '—'} ({v.reviewCount ?? 0})</span>
              <span>Lat</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatCoord(v.lat)}</span>
              <span>Lng</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatCoord(v.lng)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={save} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: t.blue, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg && (
          <span style={{ fontSize: 13, fontWeight: 600, color: msg === 'Saved' ? t.green : t.red }}>{msg}</span>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: darkTheme.textSec, marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '7px 10px',
  borderRadius: 6,
  border: `1px solid ${darkTheme.border}`,
  background: darkTheme.bgInput,
  color: darkTheme.text,
  fontSize: 13,
  fontFamily: 'inherit',
};
