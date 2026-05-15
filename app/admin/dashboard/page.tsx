'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders, withVenueQuery } from '@/lib/admin-api';
import type { BookingResult, VenueResult } from '@/lib/types';
import { formatDateShort, formatVndFull, toLocalDateKey } from '@/lib/formatters';
import {
  BookingCardCompact,
  type ProofModalState,
} from '../components/BookingCardCompact';

const t = darkTheme;

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<ProofModalState>(null);

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

    fetch(withVenueQuery('/api/admin/bookings', vId) + '&status=payment_submitted', { headers: adminAuthHeaders(token) })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((rows: BookingResult[]) => setPaymentSubmitted(Array.isArray(rows) ? rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : []))
      .catch(() => setPaymentSubmitted([]));

    fetch(withVenueQuery('/api/admin/bookings', vId) + '&status=pending', { headers: adminAuthHeaders(token) })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((rows: BookingResult[]) => setPendingNew(Array.isArray(rows) ? rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : []))
      .catch(() => setPendingNew([]));

    const today = toLocalDateKey(new Date());
    fetch(`/api/venues/${vId}?date=${today}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setVenue)
      .catch(() => setVenue(null));
  }, [handleAuthFail]);

  useEffect(() => { load(); }, [load]);

  const todayLabel = useMemo(() => formatDateShort(new Date()), []);

  const times = useMemo(() => {
    if (!venue?.courts?.length) return [];
    const set = new Set<string>();
    for (const c of venue.courts) for (const s of c.slots) set.add(s.time);
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
    } catch { alert('Update failed'); }
    finally { setBusyId(null); setRejectId(null); setRejectNote(''); }
  };

  if (!session) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Dashboard</h1>
        <span style={{ fontSize: 13, color: t.textSec }}>{todayLabel}</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Pending pay', value: stats?.pendingCount ?? '—', color: t.orange },
          { label: 'Verify pay', value: stats?.paymentSubmittedCount ?? '—', color: '#E8C547' },
          { label: 'Paid today', value: stats?.confirmedToday ?? '—', color: t.green },
          { label: 'Revenue', value: stats ? formatVndFull(stats.revenueToday) : '—', color: t.accent },
          { label: 'Courts', value: stats ? `${stats.courtsActive}/${stats.courtsTotal}` : '—', color: t.blue },
        ].map((c) => (
          <div key={c.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Verify payment */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Verify payment</h2>
          <span style={{ background: '#E8C547', color: '#000', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 6 }}>{paymentSubmitted.length}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: t.textSec }}>Player marked &quot;I&apos;ve paid&quot;. Check your bank, then confirm or send back to pending.</p>
        {paymentSubmitted.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: 13 }}>No bookings awaiting verification.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paymentSubmitted.map((b) => (
              <BookingCardCompact key={b.id} b={b} busyId={busyId} rejectId={rejectId} rejectNote={rejectNote}
                onRejectNote={setRejectNote} onRejectId={setRejectId} onPatch={patchBooking} onProof={setProofModal} showDate={false} />
            ))}
          </div>
        )}
      </section>

      {/* New requests */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>New requests</h2>
          <span style={{ background: t.orange, color: '#000', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 6 }}>{pendingNew.length}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: t.textSec }}>Awaiting player payment. Reject if you cannot host the booking.</p>
        {pendingNew.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: 13 }}>No new unpaid requests.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingNew.map((b) => (
              <BookingCardCompact key={b.id} b={b} busyId={busyId} rejectId={rejectId} rejectNote={rejectNote}
                onRejectNote={setRejectNote} onRejectId={setRejectId} onPatch={patchBooking} showDate={false} />
            ))}
          </div>
        )}
      </section>

      {/* Today's courts */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>Today&apos;s courts</h2>
        {!venue ? (
          <div style={{ color: t.textSec, fontSize: 13 }}>Loading schedule…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontSize: 10 }}>Court</th>
                  {times.map((time) => (
                    <th key={time} style={{ padding: '4px 3px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, whiteSpace: 'nowrap', fontSize: 9 }}>{time}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {venue.courts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: '4px 6px', borderBottom: `1px solid ${t.border}`, fontWeight: 600, maxWidth: 60, wordBreak: 'break-word', fontSize: 11 }}>{c.name}</td>
                    {times.map((time) => {
                      const slot = c.slots.find((s) => s.time === time);
                      const bg = !c.isAvailable ? t.red : !slot ? t.border : slot.isBooked ? t.accent : t.green;
                      return (
                        <td key={time} style={{ padding: 2, borderBottom: `1px solid ${t.border}`, textAlign: 'center' }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, margin: '0 auto', background: bg, opacity: slot ? 1 : 0.25 }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 6 }}>Green = free · Lime = booked · Red = maintenance</div>
          </div>
        )}
      </section>

      {/* Proof modal */}
      {proofModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setProofModal(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Payment proof — {proofModal.orderRef}</div>
            <img src={proofModal.url} alt="Payment proof" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />
            <button type="button" onClick={() => setProofModal(null)} style={{ position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: 16, border: 'none', background: '#fff', color: '#000', fontWeight: 900, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
