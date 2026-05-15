'use client';

import { useCallback, useEffect, useState, useMemo, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme, type ThemeTokens } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import { formatVndFull } from '@/lib/formatters';

const t: ThemeTokens = darkTheme;

/* ─── helpers ──────────────────────────────────────────────────────────── */

function defaultMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}`;
}

function monthBounds(month: string): { start: string; endExclusive: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const start = `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-01`;
  const next = mo === 12 ? { y: y + 1, mo: 1 } : { y, mo: mo + 1 };
  const endExclusive = `${next.y.toString().padStart(4, '0')}-${next.mo.toString().padStart(2, '0')}-01`;
  return { start, endExclusive };
}

function shiftMonth(ym: string, delta: number): string {
  const b = monthBounds(ym);
  if (!b) return ym;
  const [y0, m0] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y0, m0 - 1 + delta, 1));
  return defaultMonthKey(d);
}

function formatMonthLabel(ym: string): string {
  const b = monthBounds(ym);
  if (!b) return ym;
  const [y, mo] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function daysInMonth(ym: string): number {
  const [y, mo] = ym.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

/* ─── types ────────────────────────────────────────────────────────────── */

type ReportsPayload = {
  month: string;
  directRevenue: number;
  coachRevenue: number;
  totalRevenue: number;
  directBookingCount: number;
  coachSessionCount: number;
};

type CoachSessionRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  courtFee: number;
  paymentStatus: string;
  status: string;
  coach: { id: string; name: string; phone: string };
};

type BookingRow = {
  id: string;
  orderId: string;
  date: string;
  status: 'pending' | 'payment_submitted' | 'paid' | 'canceled';
  totalPrice: number;
  userName: string;
  userPhone: string;
  slots: { courtName: string; time: string; duration: number; price: number }[];
  createdAt: string;
};

/* ─── sub-components ───────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  paid: t.green,
  pending: t.orange,
  payment_submitted: t.blue,
  canceled: t.red,
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  pending: 'Pending',
  payment_submitted: 'Submitted',
  canceled: 'Canceled',
};

function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${highlight ? t.accent : t.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        ...(highlight ? { boxShadow: `0 0 0 1px ${t.accentBgStrong}` } : {}),
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: t.accent, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: t.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DailyRevenueChart({ data, max }: { data: { day: number; label: string; amount: number }[]; max: number }) {
  if (max === 0) return <div style={{ color: t.textMuted, textAlign: 'center', padding: 16 }}>No paid bookings this month</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {data.map((d) => {
        const pct = max > 0 ? (d.amount / max) * 100 : 0;
        return (
          <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 20 }}>
            <div style={{ width: 32, fontSize: 11, color: t.textMuted, textAlign: 'right', flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, height: 14, background: t.bgInput, borderRadius: 3, overflow: 'hidden' }}>
              {pct > 0 && (
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(pct, 1.5)}%`,
                    background: `linear-gradient(90deg, ${t.accent}, ${t.green})`,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              )}
            </div>
            <div style={{ width: 80, fontSize: 10, color: d.amount > 0 ? t.textSec : t.textMuted, textAlign: 'right', flexShrink: 0 }}>
              {d.amount > 0 ? formatVndFull(d.amount) : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; count: number; color: string; pct: number }[] }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <div style={{ color: t.textMuted, textAlign: 'center', padding: 16 }}>No bookings</div>;

  let accumulated = 0;
  const gradientParts: string[] = [];
  for (const seg of segments) {
    if (seg.count === 0) continue;
    const start = accumulated;
    accumulated += seg.pct;
    gradientParts.push(`${seg.color} ${start}% ${accumulated}%`);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(${gradientParts.join(', ')})`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: t.bgCard,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{total}</div>
          <div style={{ fontSize: 9, color: t.textMuted }}>TOTAL</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: t.text, minWidth: 70 }}>{seg.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textSec }}>{seg.count}</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>({seg.pct.toFixed(0)}%)</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5..23

function PeakHoursHeatmap({ hourCounts, maxCount }: { hourCounts: Map<number, number>; maxCount: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {HOURS.map((h) => {
        const count = hourCounts.get(h) ?? 0;
        const intensity = maxCount > 0 ? count / maxCount : 0;
        const bg =
          intensity === 0
            ? t.bgInput
            : `rgba(184,242,0,${(0.15 + intensity * 0.85).toFixed(2)})`;
        const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
        return (
          <div
            key={h}
            title={`${label}: ${count} booking${count !== 1 ? 's' : ''}`}
            style={{
              width: 48,
              height: 48,
              borderRadius: 6,
              background: bg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${intensity > 0.5 ? 'rgba(184,242,0,0.3)' : t.border}`,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: intensity > 0.4 ? '#111' : t.textSec }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: intensity > 0.4 ? '#111' : t.text }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}

function CourtUtilizationBars({ courts, totalSlots }: { courts: { name: string; booked: number; total: number }[]; totalSlots: number }) {
  if (courts.length === 0) return <div style={{ color: t.textMuted, padding: 12 }}>No court data</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {courts.map((c) => {
        const pct = c.total > 0 ? (c.booked / c.total) * 100 : 0;
        return (
          <div key={c.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{c.name}</span>
              <span style={{ fontSize: 11, color: t.textSec }}>{c.booked}/{c.total} slots ({pct.toFixed(0)}%)</span>
            </div>
            <div style={{ height: 10, background: t.bgInput, borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct > 70 ? t.green : pct > 40 ? t.accent : t.blue,
                  borderRadius: 5,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopPlayersTable({ players }: { players: { name: string; phone: string; count: number; spent: number }[] }) {
  if (players.length === 0) return <div style={{ color: t.textMuted, textAlign: 'center', padding: 12 }}>No bookings</div>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: t.accent, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <th style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, width: 32 }}>#</th>
          <th style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}` }}>Player</th>
          <th style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, textAlign: 'right' }}>Bookings</th>
          <th style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, textAlign: 'right' }}>Total Spent</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr key={p.phone} style={{ background: i % 2 === 0 ? 'transparent' : t.bgSurface }}>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: 700 }}>{i + 1}</td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ color: t.text, fontWeight: 600, fontSize: 13 }}>{p.name}</div>
              <div style={{ color: t.textMuted, fontSize: 11 }}>{p.phone}</div>
            </td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, textAlign: 'right', color: t.text, fontWeight: 700 }}>
              {p.count}
            </td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, textAlign: 'right', color: t.green, fontWeight: 600 }}>
              {formatVndFull(p.spent)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── section wrapper ──────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: t.accent }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────────────────── */

export default function AdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [month, setMonth] = useState(() => defaultMonthKey(new Date()));
  const [reports, setReports] = useState<ReportsPayload | null>(null);
  const [coachSessions, setCoachSessions] = useState<CoachSessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleAuthFail = useCallback(() => {
    clearAdminSession();
    router.replace('/admin');
  }, [router]);

  const load = useCallback(() => {
    const s = readAdminSession();
    if (!s) {
      setSession(null);
      setLoading(false);
      return;
    }
    setSession(s);
    setLoading(true);
    const base = `/api/admin/venues/${encodeURIComponent(s.venueId)}`;
    const h = adminAuthHeaders(s.token);
    const bounds = monthBounds(month);
    if (!bounds) {
      setLoading(false);
      return;
    }

    void (async () => {
      const loadReports = async () => {
        const r = await fetch(`${base}/reports?month=${encodeURIComponent(month)}`, { headers: h });
        if (r.status === 401) { handleAuthFail(); return; }
        if (!r.ok) { setReports(null); return; }
        setReports((await r.json()) as ReportsPayload);
      };

      const loadBookings = async () => {
        const r = await fetch(`/api/admin/bookings?venueId=${encodeURIComponent(s.venueId)}`, { headers: h });
        if (r.status === 401) { handleAuthFail(); return; }
        if (!r.ok) { setBookings([]); return; }
        const all = (await r.json()) as BookingRow[];
        const filtered = all.filter((b) => b.date >= bounds.start && b.date < bounds.endExclusive);
        setBookings(filtered);
      };

      const loadSessions = async () => {
        const r = await fetch(`${base}/sessions?limit=500`, { headers: h });
        if (r.status === 401) { handleAuthFail(); return; }
        if (!r.ok) { setCoachSessions([]); return; }
        const payload = (await r.json()) as { sessions: CoachSessionRow[] };
        const rows = Array.isArray(payload.sessions) ? payload.sessions : [];
        setCoachSessions(rows.filter((row) => row.date >= bounds.start && row.date < bounds.endExclusive));
      };

      try {
        await Promise.all([loadReports(), loadBookings(), loadSessions()]);
      } catch {
        setBookings([]);
        setCoachSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [handleAuthFail, month]);

  useEffect(() => { setSession(readAdminSession()); }, []);
  useEffect(() => { load(); }, [load]);

  /* ─── derived analytics ───────────────────────────────────────────── */

  const totalBookings = (reports?.directBookingCount ?? 0) + (reports?.coachSessionCount ?? 0);
  const avgBookingValue = totalBookings > 0 ? (reports?.totalRevenue ?? 0) / totalBookings : 0;

  const dailyRevenue = useMemo(() => {
    const days = daysInMonth(month);
    const map = new Map<number, number>();
    for (const b of bookings) {
      if (b.status !== 'paid') continue;
      const day = parseInt(b.date.split('-')[2], 10);
      map.set(day, (map.get(day) ?? 0) + b.totalPrice);
    }
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      label: String(i + 1),
      amount: map.get(i + 1) ?? 0,
    }));
  }, [bookings, month]);

  const dailyMax = useMemo(() => Math.max(...dailyRevenue.map((d) => d.amount), 0), [dailyRevenue]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = { paid: 0, pending: 0, payment_submitted: 0, canceled: 0 };
    for (const b of bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;
    const total = bookings.length || 1;
    return (['paid', 'pending', 'payment_submitted', 'canceled'] as const).map((s) => ({
      label: STATUS_LABELS[s],
      count: counts[s],
      color: STATUS_COLORS[s],
      pct: (counts[s] / total) * 100,
    }));
  }, [bookings]);

  const { hourCounts, maxHourCount } = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of bookings) {
      if (b.status === 'canceled') continue;
      for (const slot of b.slots) {
        const hr = parseInt(slot.time.split(':')[0], 10);
        if (Number.isFinite(hr)) counts.set(hr, (counts.get(hr) ?? 0) + 1);
      }
    }
    let mx = 0;
    for (const v of counts.values()) if (v > mx) mx = v;
    return { hourCounts: counts, maxHourCount: mx };
  }, [bookings]);

  const courtUtil = useMemo(() => {
    const courtSlots = new Map<string, { booked: number; total: number }>();
    for (const b of bookings) {
      if (b.status === 'canceled') continue;
      for (const slot of b.slots) {
        const entry = courtSlots.get(slot.courtName) ?? { booked: 0, total: 0 };
        entry.booked++;
        courtSlots.set(slot.courtName, entry);
      }
    }
    const days = daysInMonth(month);
    const slotsPerDay = 18; // 5:00-23:00
    for (const entry of courtSlots.values()) {
      entry.total = days * slotsPerDay;
    }
    return Array.from(courtSlots.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.booked - a.booked);
  }, [bookings, month]);

  const topPlayers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; spent: number }>();
    for (const b of bookings) {
      if (b.status === 'canceled') continue;
      const key = b.userPhone || b.userName;
      const entry = map.get(key) ?? { name: b.userName, phone: b.userPhone, count: 0, spent: 0 };
      entry.count++;
      entry.spent += b.totalPrice;
      if (b.userName && b.userName.length > entry.name.length) entry.name = b.userName;
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.spent - a.spent)
      .slice(0, 10);
  }, [bookings]);

  /* ─── render ──────────────────────────────────────────────────────── */

  if (!session && !loading) return null;

  const btnStyle: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.bgInput,
    color: t.text,
    fontSize: 18,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div>
      <style>{`@keyframes cm-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.accent }}>Analytics</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} style={btnStyle}>
            ‹
          </button>
          <div style={{ fontWeight: 700, fontSize: 14, color: t.text, minWidth: 140, textAlign: 'center' }}>
            {formatMonthLabel(month)}
          </div>
          <button type="button" aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))} style={btnStyle}>
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: t.textSec }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: `3px solid ${t.border}`,
              borderTopColor: t.accent,
              borderRadius: '50%',
              animation: 'cm-spin 0.75s linear infinite',
            }}
          />
          Loading analytics…
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <KpiCard
              label="Total Revenue"
              value={formatVndFull(reports?.totalRevenue ?? 0)}
              sub={`${totalBookings} total bookings`}
              highlight
            />
            <KpiCard
              label="Direct Bookings"
              value={String(reports?.directBookingCount ?? 0)}
              sub={formatVndFull(reports?.directRevenue ?? 0)}
            />
            <KpiCard
              label="Coach Sessions"
              value={String(reports?.coachSessionCount ?? 0)}
              sub={`${formatVndFull(reports?.coachRevenue ?? 0)} court fees`}
            />
            <KpiCard
              label="Avg Booking Value"
              value={formatVndFull(avgBookingValue)}
              sub={totalBookings > 0 ? `across ${totalBookings} bookings` : 'no bookings'}
            />
          </div>

          {/* Two-column layout for charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Status Donut */}
            <Section title="Booking Status">
              <DonutChart segments={statusBreakdown} />
            </Section>

            {/* Peak Hours */}
            <Section title="Peak Hours">
              <PeakHoursHeatmap hourCounts={hourCounts} maxCount={maxHourCount} />
            </Section>
          </div>

          {/* Daily Revenue */}
          <Section title="Daily Revenue (Paid Bookings)">
            <DailyRevenueChart data={dailyRevenue} max={dailyMax} />
          </Section>

          {/* Two-column: Court Utilization + Top Players */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Section title="Court Utilization">
              <CourtUtilizationBars courts={courtUtil} totalSlots={0} />
            </Section>

            <Section title="Top 10 Players">
              <TopPlayersTable players={topPlayers} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
