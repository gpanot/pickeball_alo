'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme, type ThemeTokens } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import { formatVndFull } from '@/lib/formatters';

const t: ThemeTokens = darkTheme;

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

export default function AdminReportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [month, setMonth] = useState(() => defaultMonthKey(new Date()));
  const [reports, setReports] = useState<ReportsPayload | null>(null);
  const [sessions, setSessions] = useState<CoachSessionRow[]>([]);
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
    const m = monthBounds(month);
    if (!m) {
      setLoading(false);
      return;
    }
    const { start, endExclusive } = m;

    void (async () => {
      const loadReports = async () => {
        const r = await fetch(`${base}/reports?month=${encodeURIComponent(month)}`, { headers: h });
        if (r.status === 401) {
          handleAuthFail();
          return;
        }
        if (!r.ok) {
          setReports(null);
          return;
        }
        setReports((await r.json()) as ReportsPayload);
      };

      const loadSessionsForMonth = async () => {
        const collected: CoachSessionRow[] = [];
        let offset = 0;
        const pageSize = 200;
        for (;;) {
          const r = await fetch(`${base}/sessions?limit=${pageSize}&offset=${offset}`, { headers: h });
          if (r.status === 401) {
            handleAuthFail();
            return;
          }
          if (!r.ok) throw new Error('sessions');
          const payload = (await r.json()) as { sessions: CoachSessionRow[] };
          const batch = Array.isArray(payload.sessions) ? payload.sessions : [];
          if (batch.length === 0) break;
          for (const row of batch) {
            if (row.date >= start && row.date < endExclusive) collected.push(row);
          }
          const oldest = batch[batch.length - 1]?.date;
          offset += batch.length;
          if (batch.length < pageSize) break;
          if (oldest && oldest < start) break;
          if (offset > 5000) break;
        }
        collected.sort((a, b) => {
          const dc = b.date.localeCompare(a.date);
          if (dc !== 0) return dc;
          return b.startTime.localeCompare(a.startTime);
        });
        setSessions(collected);
      };

      try {
        await Promise.all([loadReports(), loadSessionsForMonth()]);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [handleAuthFail, month]);

  useEffect(() => {
    const s = readAdminSession();
    setSession(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!session && !loading) return null;

  const cardBase: CSSProperties = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: 16,
  };

  return (
    <div>
      <style>{`
        @keyframes cm-admin-spin { to { transform: rotate(360deg); } }
      `}</style>

      <h1 style={{ margin: '0 0 16px', fontSize: 22, color: t.accent }}>Reports</h1>

      <div
        style={{
          ...cardBase,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 16,
          maxWidth: 420,
        }}
      >
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontSize: 18,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, color: t.text }}>
          {formatMonthLabel(month)}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontSize: 18,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ›
        </button>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 48,
            color: t.textSec,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              border: `3px solid ${t.border}`,
              borderTopColor: t.accent,
              borderRadius: '50%',
              animation: 'cm-admin-spin 0.75s linear infinite',
            }}
          />
          <span>Loading reports…</span>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={cardBase}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>
                Direct court bookings
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: t.text }}>{reports?.directBookingCount ?? 0}</div>
              <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>bookings</div>
              <div style={{ fontSize: 15, color: t.green, marginTop: 12, fontWeight: 600 }}>
                {formatVndFull(reports?.directRevenue ?? 0)}
              </div>
            </div>
            <div style={cardBase}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>
                Coach sessions
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: t.text }}>{reports?.coachSessionCount ?? 0}</div>
              <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>sessions (confirmed / completed)</div>
              <div style={{ fontSize: 15, color: t.green, marginTop: 12, fontWeight: 600 }}>
                {formatVndFull(reports?.coachRevenue ?? 0)} court fees
              </div>
            </div>
            <div style={{ ...cardBase, borderColor: t.accent, boxShadow: `0 0 0 1px ${t.accentBgStrong}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>
                Total revenue
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{formatVndFull(reports?.totalRevenue ?? 0)}</div>
              <div style={{ fontSize: 12, color: t.textSec, marginTop: 8 }}>Direct + coach court fees</div>
            </div>
          </div>

          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: t.accent }}>Coach sessions this month</h2>
          <div
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 16,
              overflowX: 'auto',
            }}
          >
            {sessions.length === 0 ? (
              <div style={{ color: t.textSec, textAlign: 'center', padding: 24 }}>No coach sessions in this month.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr
                    style={{
                      textAlign: 'left',
                      color: t.accent,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Date</th>
                    <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Coach</th>
                    <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Time</th>
                    <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Court fee</th>
                    <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((row, i) => {
                    const bg = i % 2 === 0 ? 'transparent' : t.bgSurface;
                    return (
                      <tr key={row.id} style={{ background: bg }}>
                        <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>{row.date}</td>
                        <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: 600 }}>
                          {row.coach.name}
                        </td>
                        <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.textSec }}>
                          {row.startTime} – {row.endTime}
                        </td>
                        <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.green, fontWeight: 600 }}>
                          {formatVndFull(row.courtFee)}
                        </td>
                        <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}` }}>
                          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: t.blue }}>
                            {row.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
