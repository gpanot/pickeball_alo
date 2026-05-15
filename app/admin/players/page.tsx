'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import type { BookingResult } from '@/lib/types';
import { formatVndFull } from '@/lib/formatters';

const t = darkTheme;

type SortKey = 'name' | 'totalBookings' | 'totalSpent' | 'lastBooking';

interface PlayerRow {
  userId: string;
  name: string;
  phone: string;
  totalBookings: number;
  paidBookings: number;
  totalSpent: number;
  firstBooking: string;
  lastBooking: string;
  frequency: 'Regular' | 'Occasional' | 'One-time';
}

function computeFrequency(totalBookings: number, firstDate: string, lastDate: string): PlayerRow['frequency'] {
  if (totalBookings <= 1) return 'One-time';
  const first = new Date(firstDate);
  const last = new Date(lastDate);
  const diffMs = last.getTime() - first.getTime();
  const months = Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 30));
  const perMonth = totalBookings / months;
  if (perMonth >= 3) return 'Regular';
  if (perMonth >= 1) return 'Occasional';
  return 'One-time';
}

const FREQ_COLORS: Record<PlayerRow['frequency'], string> = {
  Regular: t.green,
  Occasional: t.blue,
  'One-time': t.textMuted,
};

function aggregatePlayers(bookings: BookingResult[]): PlayerRow[] {
  const map = new Map<string, {
    name: string;
    phone: string;
    total: number;
    paid: number;
    spent: number;
    dates: string[];
  }>();

  for (const b of bookings) {
    let entry = map.get(b.userId);
    if (!entry) {
      entry = { name: b.userName, phone: b.userPhone, total: 0, paid: 0, spent: 0, dates: [] };
      map.set(b.userId, entry);
    }
    entry.total += 1;
    entry.dates.push(b.date);
    if (entry.name.length < b.userName.length) entry.name = b.userName;
    if (b.status === 'paid') {
      entry.paid += 1;
      entry.spent += b.totalPrice;
    }
  }

  const players: PlayerRow[] = [];
  for (const [userId, e] of map) {
    e.dates.sort();
    const first = e.dates[0];
    const last = e.dates[e.dates.length - 1];
    players.push({
      userId,
      name: e.name,
      phone: e.phone,
      totalBookings: e.total,
      paidBookings: e.paid,
      totalSpent: e.spent,
      firstBooking: first,
      lastBooking: last,
      frequency: computeFrequency(e.total, first, last),
    });
  }
  return players;
}

export default function AdminPlayersPage() {
  const router = useRouter();
  const session = useMemo(() => readAdminSession(), []);
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalBookings');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?venueId=${session.venueId}`, {
        headers: adminAuthHeaders(session.token),
      });
      if (res.status === 401) {
        clearAdminSession();
        router.replace('/admin');
        return;
      }
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => { load(); }, [load]);

  const players = useMemo(() => aggregatePlayers(bookings), [bookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return players;
    return players.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }, [players, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'totalBookings':
          cmp = a.totalBookings - b.totalBookings;
          break;
        case 'totalSpent':
          cmp = a.totalSpent - b.totalSpent;
          break;
        case 'lastBooking':
          cmp = a.lastBooking.localeCompare(b.lastBooking);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortAsc]);

  const stats = useMemo(() => {
    if (!players.length) return { total: 0, avgBookings: 0, topSpender: null as PlayerRow | null };
    const totalBookings = players.reduce((s, p) => s + p.totalBookings, 0);
    const topSpender = players.reduce((best, p) => (p.totalSpent > (best?.totalSpent ?? 0) ? p : best), players[0]);
    return {
      total: players.length,
      avgBookings: Math.round((totalBookings / players.length) * 10) / 10,
      topSpender: topSpender.totalSpent > 0 ? topSpender : null,
    };
  }, [players]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  if (!session) return null;

  const sortBtnStyle = (key: SortKey): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 14,
    border: `1px solid ${sortKey === key ? t.accent : t.border}`,
    background: sortKey === key ? `${t.accent}18` : 'transparent',
    color: sortKey === key ? t.accent : t.textSec,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Players</h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: t.accent,
            background: `${t.accent}18`,
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          {stats.total}
        </span>
      </div>

      {/* Stats summary */}
      {!loading && players.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 14,
            overflowX: 'auto',
            paddingBottom: 2,
          }}
        >
          <StatCard label="Unique players" value={String(stats.total)} />
          <StatCard label="Avg bookings/player" value={String(stats.avgBookings)} />
          {stats.topSpender && (
            <StatCard
              label="Top spender"
              value={stats.topSpender.name}
              sub={formatVndFull(stats.topSpender.totalSpent)}
            />
          )}
        </div>
      )}

      {/* Search */}
      <input
        type="search"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: t.bgInput,
          color: t.text,
          fontFamily: 'inherit',
          fontSize: 13,
          marginBottom: 10,
        }}
      />

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: t.textMuted, marginRight: 2 }}>Sort:</span>
        {([
          ['name', 'Name'],
          ['totalBookings', 'Bookings'],
          ['totalSpent', 'Spent'],
          ['lastBooking', 'Last visit'],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleSort(key)}
            style={sortBtnStyle(key)}
          >
            {label} {sortKey === key ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: t.textSec, fontSize: 13 }}>
          Loading…
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: t.textSec, fontSize: 13 }}>
          {search ? 'No players match your search.' : 'No bookings found.'}
        </div>
      )}

      {/* Player table */}
      {!loading && sorted.length > 0 && (
        <div
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto auto auto',
              gap: 8,
              padding: '8px 12px',
              fontSize: 10,
              fontWeight: 700,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              borderBottom: `1px solid ${t.border}`,
              background: t.bgSurface,
              alignItems: 'center',
            }}
          >
            <span>Player</span>
            <span style={{ textAlign: 'right', minWidth: 50 }}>Total</span>
            <span style={{ textAlign: 'right', minWidth: 40 }}>Paid</span>
            <span style={{ textAlign: 'right', minWidth: 80 }}>Spent</span>
            <span style={{ textAlign: 'right', minWidth: 70 }}>Last visit</span>
            <span style={{ textAlign: 'center', minWidth: 72 }}>Freq</span>
          </div>

          {/* Rows */}
          {sorted.map((p, i) => (
            <div
              key={p.userId}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto auto auto',
                gap: 8,
                padding: '8px 12px',
                alignItems: 'center',
                borderBottom: i < sorted.length - 1 ? `1px solid ${t.border}` : undefined,
              }}
            >
              {/* Name + phone */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <a
                  href={`tel:${p.phone}`}
                  style={{ fontSize: 11, color: t.blue, textDecoration: 'none' }}
                >
                  {p.phone}
                </a>
              </div>

              {/* Total bookings */}
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', minWidth: 50 }}>
                {p.totalBookings}
              </span>

              {/* Paid */}
              <span style={{ fontSize: 12, color: t.textSec, textAlign: 'right', minWidth: 40 }}>
                {p.paidBookings}
              </span>

              {/* Spent */}
              <span style={{ fontSize: 12, color: t.green, fontWeight: 600, textAlign: 'right', minWidth: 80, whiteSpace: 'nowrap' }}>
                {p.totalSpent > 0 ? formatVndFull(p.totalSpent) : '—'}
              </span>

              {/* Last visit */}
              <span style={{ fontSize: 11, color: t.textSec, textAlign: 'right', minWidth: 70, whiteSpace: 'nowrap' }}>
                {p.lastBooking}
              </span>

              {/* Frequency badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: FREQ_COLORS[p.frequency],
                  background: `${FREQ_COLORS[p.frequency]}18`,
                  padding: '2px 8px',
                  borderRadius: 8,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  minWidth: 72,
                  display: 'inline-block',
                }}
              >
                {p.frequency}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        flex: '0 0 auto',
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.green, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
