'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme } from '@/lib/theme';
import { writeAdminSession } from '@/lib/admin-storage';

const t = darkTheme;

type VenueOpt = { id: string; name: string };

export default function AdminLoginPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<VenueOpt[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [venueId, setVenueId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** Server search (tokenized AND on name/address) + capped rows — avoids a 2k-venue JSON payload that broke the picker. */
  useEffect(() => {
    const q = search.trim();
    const delay = q.length > 0 ? 200 : 0;
    const tid = setTimeout(() => {
      setVenuesLoading(true);
      const url = q
        ? `/api/admin/venues?q=${encodeURIComponent(q)}`
        : '/api/admin/venues';
      fetch(url)
        .then((r) => r.json())
        .then((data) => setVenues(Array.isArray(data) ? data : []))
        .catch(() => setVenues([]))
        .finally(() => setVenuesLoading(false));
    }, delay);
    return () => clearTimeout(tid);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!venueId || !pin) {
      setError('Choose a venue and enter your PIN');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'Wrong PIN' ? 'Wrong PIN' : data.error || 'Sign in failed');
        return;
      }
      writeAdminSession({
        token: data.token,
        venueId: data.venueId,
        venueName: data.venueName,
      });
      router.push('/admin/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '48px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, letterSpacing: -0.5 }}>
          COURTMAP
        </div>
        <div style={{ fontSize: 13, color: t.textSec, marginTop: 6 }}>Venue Admin</div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: t.shadowSm,
        }}
      >
        <label style={{ display: 'block', fontSize: 13, color: t.textSec, marginBottom: 8 }}>Venue</label>
        <input
          type="text"
          placeholder="Type to search (e.g. 65, street, district)…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVenueId('');
          }}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontSize: 15,
            marginBottom: 6,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10, lineHeight: 1.45 }}>
          {venuesLoading
            ? 'Searching…'
            : search.trim()
              ? venues.length === 0
                ? 'No venues match — try another word or full club name. If the club is missing, run npm run db:seed to import public/courts.json.'
                : `${venues.length} match${venues.length === 1 ? '' : 'es'}`
              : 'Showing first venues alphabetically — type to narrow down (e.g. “65” or “pickleball”).'}
        </div>
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontSize: 15,
            marginBottom: 18,
            fontFamily: 'inherit',
          }}
        >
          <option value="">Select venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', fontSize: 13, color: t.textSec, marginBottom: 8 }}>PIN</label>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontSize: 18,
            letterSpacing: 4,
            marginBottom: 18,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        {error ? (
          <div style={{ color: t.red, fontSize: 14, marginBottom: 12 }}>{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            border: 'none',
            background: t.blue,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
