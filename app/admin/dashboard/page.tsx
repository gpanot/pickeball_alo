'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders, withVenueQuery } from '@/lib/admin-api';
import type { BookingResult, VenueResult } from '@/lib/types';
import {
  formatBookingOrderRef,
  formatDateShort,
  formatVndFull,
  toLocalDateKey,
} from '@/lib/formatters';

const t = darkTheme;

function formatRelativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function slotSummary(slots: { courtName?: string; time?: string }[]): string {
  if (!slots?.length) return '—';
  return slots.map((s) => `${s.courtName ?? '?'} ${s.time ?? ''}`).join(', ');
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [stats, setStats] = useState<{
    today: string;
    pendingCount: number;
    paymentSubmittedCount: number;
    confirmedToday: number;
    revenueToday: number;
    courtsActive: number;
    courtsTotal: number;
  } | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState<BookingResult[]>([]);
  const [pendingNew, setPendingNew] = useState<BookingResult[]>([]);
  const [venue, setVenue] = useState<VenueResult | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [notReceivedId, setNotReceivedId] = useState<string | null>(null);
  const [notReceivedNote, setNotReceivedNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleAuthFail = useCallback(() => {
    clearAdminSession();
    router.replace('/admin');
  }, [router]);

  const load = useCallback(() => {
    const s = readAdminSession();
    if (!s) return;
    setSession(s);
    const vId = s.venueId;
    const token = s.token;

    fetch(withVenueQuery('/api/admin/dashboard', vId), { headers: adminAuthHeaders(token) })
      .then((r) => { if (r.status === 401) { handleAuthFail(); return null; } if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => d && setStats(d))
      .catch(() => setStats(null));

    fetch(withVenueQuery('/api/admin/bookings', vId) + '&status=payment_submitted', {
      headers: adminAuthHeaders(token),
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((rows: BookingResult[]) =>
        setPaymentSubmitted(
          Array.isArray(rows) ? rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : [],
        ),
      )
      .catch(() => setPaymentSubmitted([]));

    fetch(withVenueQuery('/api/admin/bookings', vId) + '&status=pending', {
      headers: adminAuthHeaders(token),
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((rows: BookingResult[]) =>
        setPendingNew(
          Array.isArray(rows) ? rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : [],
        ),
      )
      .catch(() => setPendingNew([]));

    const today = toLocalDateKey(new Date());
    fetch(`/api/venues/${vId}?date=${today}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setVenue)
      .catch(() => setVenue(null));
  }, [handleAuthFail]);

  useEffect(() => {
    load();
  }, [load]);

  const todayLabel = useMemo(() => formatDateShort(new Date()), []);

  const times = useMemo(() => {
    if (!venue?.courts?.length) return [];
    const set = new Set<string>();
    for (const c of venue.courts) {
      for (const s of c.slots) set.add(s.time);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [venue]);

  const patchBooking = async (id: string, body: Record<string, unknown>) => {
    const s = readAdminSession();
    if (!s) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(s.token) },
        body: JSON.stringify({ ...body, reviewedBy: s.venueName }),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert('Update failed');
    } finally {
      setBusyId(null);
      setRejectId(null);
      setRejectNote('');
      setNotReceivedId(null);
      setNotReceivedNote('');
    }
  };

  if (!session) return null;

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Dashboard</h1>
      <div style={{ marginBottom: 16, fontSize: 13, color: t.textSec }}>{todayLabel}</div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          marginBottom: 20,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {[
          { label: 'Pending pay', value: stats?.pendingCount ?? '—', color: t.orange },
          {
            label: 'Verify pay',
            value: stats?.paymentSubmittedCount ?? '—',
            color: '#E8C547',
          },
          { label: 'Paid today', value: stats?.confirmedToday ?? '—', color: t.green },
          {
            label: 'Revenue today',
            value: stats ? formatVndFull(stats.revenueToday) : '—',
            color: t.accent,
          },
          {
            label: 'Courts active',
            value: stats ? `${stats.courtsActive} / ${stats.courtsTotal}` : '—',
            color: t.blue,
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              flex: '0 0 auto',
              minWidth: 120,
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Verify payment</h2>
          <span
            style={{
              background: '#E8C547',
              color: '#000',
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 8,
            }}
          >
            {paymentSubmitted.length}
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: t.textSec }}>
          Player marked “I&apos;ve paid”. Check your bank, then confirm or send back to pending.
        </p>
        {paymentSubmitted.length === 0 ? (
          <div style={{ color: t.textSec, fontSize: 14 }}>No bookings awaiting payment verification.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paymentSubmitted.map((b) => (
              <div
                key={b.id}
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{formatBookingOrderRef(b.orderId)}</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}>{b.userName}</div>
                <a href={`tel:${b.userPhone}`} style={{ color: t.blue, fontSize: 14 }}>
                  {b.userPhone}
                </a>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 8 }}>
                  {slotSummary(b.slots as { courtName?: string; time?: string }[])}
                </div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
                  {formatVndFull(b.totalPrice)} · submitted {b.paymentSubmittedAt ? formatRelativeTime(b.paymentSubmittedAt) : '—'}
                </div>
                {notReceivedId === b.id ? (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      value={notReceivedNote}
                      onChange={(e) => setNotReceivedNote(e.target.value)}
                      placeholder="Note (optional, e.g. transfer not found)"
                      rows={2}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        background: t.bgInput,
                        color: t.text,
                        padding: 8,
                        fontFamily: 'inherit',
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() =>
                          patchBooking(b.id, { status: 'pending', paymentNote: notReceivedNote })
                        }
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 8,
                          border: 'none',
                          background: t.orange,
                          color: '#000',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Confirm not received
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotReceivedId(null);
                          setNotReceivedNote('');
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: `1px solid ${t.border}`,
                          background: 'transparent',
                          color: t.textSec,
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => patchBooking(b.id, { status: 'paid' })}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        border: 'none',
                        background: t.green,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Confirm paid
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => setNotReceivedId(b.id)}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        border: 'none',
                        background: t.orange,
                        color: '#000',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Not received
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>New requests</h2>
          <span
            style={{
              background: t.orange,
              color: '#000',
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 8,
            }}
          >
            {pendingNew.length}
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: t.textSec }}>
          Awaiting player payment. Reject if you cannot host the booking.
        </p>
        {pendingNew.length === 0 ? (
          <div style={{ color: t.textSec, fontSize: 14 }}>No new unpaid requests.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingNew.map((b) => (
              <div
                key={b.id}
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{formatBookingOrderRef(b.orderId)}</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}>{b.userName}</div>
                <a href={`tel:${b.userPhone}`} style={{ color: t.blue, fontSize: 14 }}>
                  {b.userPhone}
                </a>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 8 }}>
                  {slotSummary(b.slots as { courtName?: string; time?: string }[])}
                </div>
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
                  {formatVndFull(b.totalPrice)} · {formatRelativeTime(b.createdAt)}
                </div>
                {rejectId === b.id ? (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason (optional)"
                      rows={2}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        background: t.bgInput,
                        color: t.text,
                        padding: 8,
                        fontFamily: 'inherit',
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() =>
                          patchBooking(b.id, { status: 'canceled', adminNote: rejectNote })
                        }
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 8,
                          border: 'none',
                          background: t.red,
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectId(null);
                          setRejectNote('');
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: `1px solid ${t.border}`,
                          background: 'transparent',
                          color: t.textSec,
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => setRejectId(b.id)}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        border: 'none',
                        background: t.red,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Today&apos;s courts</h2>
        {!venue ? (
          <div style={{ color: t.textSec }}>Loading schedule…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 6,
                      borderBottom: `1px solid ${t.border}`,
                      color: t.textMuted,
                    }}
                  >
                    Court
                  </th>
                  {times.map((time) => (
                    <th
                      key={time}
                      style={{
                        padding: 6,
                        borderBottom: `1px solid ${t.border}`,
                        color: t.textMuted,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {venue.courts.map((c) => (
                  <tr key={c.id}>
                    <td
                      style={{
                        padding: 6,
                        borderBottom: `1px solid ${t.border}`,
                        fontWeight: 600,
                        maxWidth: 72,
                        wordBreak: 'break-word',
                      }}
                    >
                      {c.name}
                    </td>
                    {times.map((time) => {
                      const slot = c.slots.find((s) => s.time === time);
                      const bg = !c.isAvailable
                        ? t.red
                        : !slot
                          ? t.border
                          : slot.isBooked
                            ? t.accent
                            : t.green;
                      return (
                        <td
                          key={time}
                          style={{
                            padding: 4,
                            borderBottom: `1px solid ${t.border}`,
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              margin: '0 auto',
                              background: bg,
                              opacity: slot ? 1 : 0.25,
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
              Green = free · Lime = booked · Red = maintenance
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
