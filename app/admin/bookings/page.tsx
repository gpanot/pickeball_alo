'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { darkTheme } from '@/lib/theme';
import { readAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import type { BookingResult, BookingStatus, VenueResult } from '@/lib/types';
import { formatBookingOrderRef, formatVndFull, toLocalDateKey } from '@/lib/formatters';
import {
  BookingCardCompact,
  STATUS_COLORS,
  STATUS_BG,
  slotSummary,
  btnSmOk,
  btnSmReject,
  btnSmGhost,
  type ProofModalState,
} from '../components/BookingCardCompact';

const t = darkTheme;

type ViewMode = 'list' | 'timeline';

/* ── Timeline ── */

function BookingTimeline({
  venue,
  bookings,
  onSelectBooking,
}: {
  venue: VenueResult | null;
  bookings: BookingResult[];
  onSelectBooking: (b: BookingResult) => void;
}) {
  const allTimes = useMemo(() => {
    if (!venue?.courts?.length) return [];
    const set = new Set<string>();
    for (const c of venue.courts) for (const s of c.slots) set.add(s.time);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [venue]);

  const bookingBySlot = useMemo(() => {
    const map = new Map<string, BookingResult>();
    for (const bk of bookings) {
      if (!bk.slots?.length) continue;
      for (const s of bk.slots) map.set(`${s.courtName}|${s.time}`, bk);
    }
    return map;
  }, [bookings]);

  if (!venue || !venue.courts?.length) {
    return <div style={{ color: t.textSec, padding: 20, textAlign: 'center' }}>No court data for this date.</div>;
  }

  const courts = venue.courts.map((c) => ({
    id: c.id,
    name: c.name,
    isAvailable: c.isAvailable,
    slots: allTimes.map((time) => {
      const venueSlot = c.slots.find((s) => s.time === time);
      return { time, isBooked: venueSlot?.isBooked ?? false, booking: bookingBySlot.get(`${c.name}|${time}`) };
    }),
  }));

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const CW = 48, CCW = 80;

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', minWidth: CCW + allTimes.length * CW }}>
          <div style={{ flexShrink: 0, width: CCW, borderRight: `1px solid ${t.border}` }}>
            <div style={{ height: 36, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${t.border}`, background: t.bgSurface }}>
              Court
            </div>
            {courts.map((c, ci) => (
              <div key={c.id} style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontWeight: 600, color: c.isAvailable ? t.text : t.textMuted, borderBottom: ci < courts.length - 1 ? `1px solid ${t.border}` : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.name}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, background: t.bgSurface }}>
              {allTimes.map((time) => (
                <div key={time} style={{ width: CW, flexShrink: 0, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: t.textMuted, borderRight: `1px solid ${t.border}` }}>
                  {time}
                </div>
              ))}
            </div>
            {courts.map((c, ci) => (
              <div key={c.id} style={{ display: 'flex', borderBottom: ci < courts.length - 1 ? `1px solid ${t.border}` : undefined }}>
                {c.slots.map((slot) => {
                  const [h, m] = slot.time.split(':').map(Number);
                  const isPast = h * 60 + m < nowMin;
                  let bg = 'transparent', color = t.textSec, cursor = 'default', label = '', opacity = 1;
                  if (!c.isAvailable) { bg = `${t.red}15`; color = t.red; label = '×'; }
                  else if (slot.booking) {
                    const st = slot.booking.status;
                    bg = st === 'pending' ? `${t.orange}25` : st === 'payment_submitted' ? '#E8C54725' : st === 'paid' ? `${t.blue}25` : st === 'canceled' ? `${t.red}12` : `${t.accent}25`;
                    color = STATUS_COLORS[st] ?? t.accent; cursor = 'pointer';
                    label = slot.booking.userName.split(' ').pop()?.slice(0, 4) ?? '';
                  } else if (slot.isBooked) { bg = `${t.accent}20`; color = t.accent; label = '▪'; }
                  else if (isPast) opacity = 0.3;
                  else bg = `${t.green}10`;
                  return (
                    <div key={slot.time} onClick={() => slot.booking && onSelectBooking(slot.booking)}
                      title={slot.booking ? `${formatBookingOrderRef(slot.booking.orderId)} · ${slot.booking.userName} · ${slot.booking.status}` : slot.isBooked ? 'Booked' : 'Available'}
                      style={{ width: CW, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color, background: bg, cursor, opacity, borderRight: `1px solid ${t.border}08`, userSelect: 'none' }}>
                      {label}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 12px', borderTop: `1px solid ${t.border}`, fontSize: 10, color: t.textMuted }}>
        {[{ label: 'Available', color: t.green }, { label: 'Pending', color: t.orange }, { label: 'Pay sent', color: '#E8C547' }, { label: 'Paid', color: t.blue }, { label: 'Booked', color: t.accent }, { label: 'Canceled', color: t.red }].map((i) => (
          <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: i.color }} />{i.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Booking detail popover (from timeline click) ── */

function BookingPopover({ booking, onClose, onPatch, busyId }: {
  booking: BookingResult; onClose: () => void;
  onPatch: (id: string, body: Record<string, unknown>) => void; busyId: string | null;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 380, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, boxShadow: t.shadow }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{formatBookingOrderRef(booking.orderId)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[booking.status], background: STATUS_BG[booking.status], padding: '3px 10px', borderRadius: 8, textTransform: 'uppercase' }}>
            {booking.status}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{booking.userName}</div>
        <a href={`tel:${booking.userPhone}`} style={{ color: t.blue, fontSize: 13 }}>{booking.userPhone}</a>
        <div style={{ fontSize: 13, color: t.textSec, marginTop: 8 }}>{booking.date} · {formatVndFull(booking.totalPrice)}</div>
        <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>{slotSummary(booking.slots as { courtName?: string; time?: string }[])}</div>
        {booking.status === 'payment_submitted' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" disabled={busyId === booking.id} onClick={() => { onPatch(booking.id, { status: 'paid' }); onClose(); }} style={btnSmOk}>Confirm paid</button>
          </div>
        )}
        {booking.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" disabled={busyId === booking.id} onClick={() => { onPatch(booking.id, { status: 'canceled' }); onClose(); }} style={btnSmReject}>Reject</button>
          </div>
        )}
        <button type="button" onClick={onClose} style={{ marginTop: 16, width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSec, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>Close</button>
      </div>
    </div>
  );
}

/* ── Create booking modal ── */

function CreateBookingModal({ venue, session, onClose, onCreated }: {
  venue: VenueResult | null;
  session: { venueId: string; venueName: string; token: string };
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const courts = venue?.courts ?? [];
  const allTimes = useMemo(() => {
    const set = new Set<string>();
    for (const c of courts) for (const s of c.slots) set.add(s.time);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [courts]);

  const toggleSlot = (courtName: string, time: string) => {
    const key = `${courtName}|${time}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectedSlotsData = useMemo(() => {
    const result: { courtName: string; time: string; price: number; duration: number }[] = [];
    for (const key of selectedSlots) {
      const [courtName, time] = key.split('|');
      const court = courts.find((c) => c.name === courtName);
      const slot = court?.slots.find((s) => s.time === time);
      if (court && slot && !slot.isBooked) {
        result.push({ courtName, time, price: slot.price, duration: 30 });
      }
    }
    return result;
  }, [selectedSlots, courts]);

  const totalPrice = selectedSlotsData.reduce((sum, s) => sum + s.price, 0);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) { setError('Name and phone required'); return; }
    if (selectedSlotsData.length === 0) { setError('Select at least one slot'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(session.token) },
        body: JSON.stringify({
          venueId: session.venueId,
          venueName: session.venueName,
          userId: `admin-walk-in-${Date.now()}`,
          userName: name.trim(),
          userPhone: phone.trim(),
          date: venue ? toLocalDateKey(new Date()) : '',
          slots: selectedSlotsData,
          totalPrice,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create booking');
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, boxShadow: t.shadow, margin: '40px 0' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>New walk-in booking</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lblStyle}>Player name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={modalInput} placeholder="Name" />
          </div>
          <div>
            <label style={lblStyle}>Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={modalInput} placeholder="+84…" type="tel" />
          </div>
        </div>
        <label style={lblStyle}>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...modalInput, marginBottom: 12 }} placeholder="Optional note" />

        <label style={lblStyle}>Select slots (tap to toggle)</label>
        {!venue ? (
          <div style={{ color: t.textSec, fontSize: 13, marginBottom: 12 }}>Loading courts…</div>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: 12, border: `1px solid ${t.border}`, borderRadius: 8 }}>
            <div style={{ display: 'flex', minWidth: 80 + allTimes.length * 44 }}>
              <div style={{ flexShrink: 0, width: 80, borderRight: `1px solid ${t.border}` }}>
                <div style={{ height: 28, fontSize: 9, fontWeight: 700, color: t.textMuted, display: 'flex', alignItems: 'center', padding: '0 6px', borderBottom: `1px solid ${t.border}` }}>Court</div>
                {courts.map((c, ci) => (
                  <div key={c.id} style={{ height: 32, fontSize: 11, fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', padding: '0 6px', borderBottom: ci < courts.length - 1 ? `1px solid ${t.border}` : undefined }}>{c.name}</div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}` }}>
                  {allTimes.map((time) => (
                    <div key={time} style={{ width: 44, flexShrink: 0, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: t.textMuted, fontWeight: 600 }}>{time}</div>
                  ))}
                </div>
                {courts.map((c, ci) => (
                  <div key={c.id} style={{ display: 'flex', borderBottom: ci < courts.length - 1 ? `1px solid ${t.border}` : undefined }}>
                    {allTimes.map((time) => {
                      const slot = c.slots.find((s) => s.time === time);
                      const key = `${c.name}|${time}`;
                      const selected = selectedSlots.has(key);
                      const booked = slot?.isBooked;
                      const avail = slot && !booked && c.isAvailable;
                      return (
                        <div key={time}
                          onClick={() => avail && toggleSlot(c.name, time)}
                          style={{
                            width: 44, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: avail ? 'pointer' : 'default',
                            background: selected ? `${t.blue}40` : booked ? `${t.accent}15` : 'transparent',
                            border: selected ? `2px solid ${t.blue}` : '2px solid transparent',
                            borderRadius: 4, fontSize: 9, color: booked ? t.textMuted : t.textSec,
                            opacity: !avail ? 0.3 : 1,
                          }}>
                          {selected ? '✓' : booked ? '×' : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedSlotsData.length > 0 && (
          <div style={{ fontSize: 13, color: t.text, marginBottom: 12, padding: '8px 10px', background: t.bgSurface, borderRadius: 8, border: `1px solid ${t.border}` }}>
            <strong>{selectedSlotsData.length} slot{selectedSlotsData.length > 1 ? 's' : ''}</strong> · {formatVndFull(totalPrice)}
            <div style={{ fontSize: 11, color: t.textSec, marginTop: 4 }}>
              {selectedSlotsData.map((s) => `${s.courtName} ${s.time}`).join(', ')}
            </div>
          </div>
        )}

        {error && <div style={{ color: t.red, fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy} onClick={handleCreate}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: t.blue, color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
            {busy ? 'Creating…' : 'Create booking'}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSec, fontFamily: 'inherit', cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit booking modal ── */

function EditBookingModal({ booking, session, onClose, onUpdated }: {
  booking: BookingResult;
  session: { token: string; venueName: string };
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [adminNote, setAdminNote] = useState(booking.adminNote ?? '');
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const transitions: { value: BookingStatus; label: string }[] = [];
  if (booking.status === 'pending') {
    transitions.push({ value: 'pending', label: 'Pending' }, { value: 'canceled', label: 'Cancel' });
  } else if (booking.status === 'payment_submitted') {
    transitions.push({ value: 'payment_submitted', label: 'Payment sent' }, { value: 'paid', label: 'Confirm paid' }, { value: 'pending', label: 'Back to pending' }, { value: 'canceled', label: 'Cancel' });
  } else if (booking.status === 'paid') {
    transitions.push({ value: 'paid', label: 'Paid' }, { value: 'canceled', label: 'Cancel' });
  } else {
    transitions.push({ value: 'canceled', label: 'Canceled' });
  }

  const handleSave = async () => {
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = { reviewedBy: session.venueName };
      if (status !== booking.status) body.status = status;
      if (adminNote.trim() !== (booking.adminNote ?? '')) body.adminNote = adminNote.trim() || null;
      if (status === 'pending' && booking.status === 'payment_submitted') body.paymentNote = adminNote.trim() || null;
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(session.token) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Update failed');
      onUpdated();
      onClose();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 400, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, boxShadow: t.shadow }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Edit {formatBookingOrderRef(booking.orderId)}</h2>
        <div style={{ fontSize: 14, marginBottom: 4 }}>{booking.userName} · <a href={`tel:${booking.userPhone}`} style={{ color: t.blue }}>{booking.userPhone}</a></div>
        <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>{booking.date} · {formatVndFull(booking.totalPrice)}</div>
        <div style={{ fontSize: 12, color: t.textSec, marginBottom: 12 }}>{slotSummary(booking.slots as { courtName?: string; time?: string }[])}</div>

        <label style={lblStyle}>Status</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {transitions.map((tr) => (
            <button key={tr.value} type="button" onClick={() => setStatus(tr.value)}
              style={{
                padding: '5px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${status === tr.value ? STATUS_COLORS[tr.value] ?? t.blue : t.border}`,
                background: status === tr.value ? `${STATUS_COLORS[tr.value] ?? t.blue}22` : 'transparent',
                color: status === tr.value ? STATUS_COLORS[tr.value] ?? t.blue : t.textSec,
              }}>
              {tr.label}
            </button>
          ))}
        </div>

        <label style={lblStyle}>Admin note</label>
        <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2}
          style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, padding: 8, fontFamily: 'inherit', fontSize: 13, marginBottom: 12 }}
          placeholder="Internal note…" />

        {error && <div style={{ color: t.red, fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy} onClick={handleSave}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: t.blue, color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSec, fontFamily: 'inherit', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */

export default function AdminBookingsPage() {
  const session = useMemo(() => readAdminSession(), []);
  const [list, setList] = useState<BookingResult[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [date, setDate] = useState<string>(() => toLocalDateKey(new Date()));
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [proofModal, setProofModal] = useState<ProofModalState>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [venue, setVenue] = useState<VenueResult | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editBooking, setEditBooking] = useState<BookingResult | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    const params = new URLSearchParams({ venueId: session.venueId });
    if (status !== 'all') params.set('status', status);
    if (date !== 'all') params.set('date', date);
    if (q.trim()) params.set('q', q.trim());
    fetch(`/api/admin/bookings?${params}`, { headers: adminAuthHeaders(session.token) })
      .then((r) => r.json())
      .then((rows: BookingResult[]) =>
        setList(Array.isArray(rows) ? rows.sort((a, b) => {
          const dc = b.date.localeCompare(a.date);
          return dc !== 0 ? dc : +new Date(b.createdAt) - +new Date(a.createdAt);
        }) : []),
      )
      .catch(() => setList([]));
  }, [session, status, date, q]);

  const loadVenue = useCallback(() => {
    if (!session || date === 'all') { setVenue(null); return; }
    fetch(`/api/venues/${session.venueId}?date=${date}`)
      .then((r) => r.json()).then(setVenue).catch(() => setVenue(null));
  }, [session, date]);

  useEffect(() => { const tmr = setTimeout(load, q ? 300 : 0); return () => clearTimeout(tmr); }, [load, q]);
  useEffect(() => { loadVenue(); }, [loadVenue]);

  const reload = () => { load(); loadVenue(); };

  const patch = async (id: string, body: Record<string, unknown>) => {
    if (!session) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(session.token) },
        body: JSON.stringify({ ...body, reviewedBy: session.venueName }),
      });
      if (!res.ok) throw new Error();
      reload();
    } catch { alert('Update failed'); }
    finally { setBusyId(null); setRejectId(null); setRejectNote(''); }
  };

  const dateChips = useMemo(() => {
    const chips: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      chips.push({ value: key, label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : `${wd} ${d.getDate()}` });
    }
    return chips;
  }, []);

  if (!session) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Bookings</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => setShowCreate(true)}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: t.blue, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New
          </button>
          <div style={{ display: 'flex', gap: 2, background: t.bgSurface, borderRadius: 8, padding: 2, border: `1px solid ${t.border}` }}>
            {(['timeline', 'list'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setViewMode(m)}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: viewMode === m ? t.blue : 'transparent', color: viewMode === m ? '#fff' : t.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {m === 'timeline' ? '▦ Timeline' : '☰ List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
        {dateChips.map((chip) => (
          <button key={chip.value} type="button" onClick={() => setDate(chip.value)}
            style={{ padding: '5px 12px', borderRadius: 16, border: `1px solid ${date === chip.value ? t.blue : t.border}`, background: date === chip.value ? `${t.blue}22` : t.bgCard, color: date === chip.value ? t.blue : t.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {chip.label}
          </button>
        ))}
        <button type="button" onClick={() => setDate('all')}
          style={{ padding: '5px 12px', borderRadius: 16, border: `1px solid ${date === 'all' ? t.blue : t.border}`, background: date === 'all' ? `${t.blue}22` : t.bgCard, color: date === 'all' ? t.blue : t.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
          All dates
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'payment_submitted', 'paid', 'canceled'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              style={{ padding: '4px 10px', borderRadius: 14, border: `1px solid ${status === s ? t.blue : t.border}`, background: status === s ? `${t.blue}22` : 'transparent', color: status === s ? t.blue : t.textSec, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {s === 'payment_submitted' ? 'Pay sent' : s}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Search name, phone, ref…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ flex: '1 1 160px', padding: '6px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontFamily: 'inherit', fontSize: 12 }} />
      </div>

      {/* Timeline */}
      {viewMode === 'timeline' && date !== 'all' && (
        <div style={{ marginBottom: 16 }}>
          <BookingTimeline venue={venue} bookings={list} onSelectBooking={setSelectedBooking} />
        </div>
      )}
      {viewMode === 'timeline' && date === 'all' && (
        <div style={{ padding: 20, textAlign: 'center', color: t.textSec, fontSize: 13, background: t.bgCard, borderRadius: 10, border: `1px solid ${t.border}`, marginBottom: 16 }}>
          Select a specific date to see the timeline view.
        </div>
      )}

      {/* List */}
      {(viewMode === 'list' || (viewMode === 'timeline' && list.length > 0)) && (
        <div>
          {viewMode === 'timeline' && (
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textSec, marginBottom: 8 }}>All bookings ({list.length})</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {list.map((b) => (
              <BookingCardCompact key={b.id} b={b} busyId={busyId} rejectId={rejectId} rejectNote={rejectNote}
                onRejectNote={setRejectNote} onRejectId={setRejectId} onPatch={patch} onProof={setProofModal}
                extra={
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button type="button" onClick={() => setEditBooking(b)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent', color: t.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Edit
                    </button>
                    {b.status !== 'canceled' && (
                      <button type="button" disabled={busyId === b.id} onClick={() => patch(b.id, { status: 'canceled' })}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${t.red}44`, background: 'transparent', color: t.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                }
              />
            ))}
            {list.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: t.textSec, fontSize: 13 }}>No bookings found.</div>}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedBooking && <BookingPopover booking={selectedBooking} onClose={() => setSelectedBooking(null)} onPatch={patch} busyId={busyId} />}
      {showCreate && <CreateBookingModal venue={venue} session={session} onClose={() => setShowCreate(false)} onCreated={reload} />}
      {editBooking && <EditBookingModal booking={editBooking} session={session} onClose={() => setEditBooking(null)} onUpdated={reload} />}

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

const lblStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: darkTheme.textSec, marginBottom: 4 };
const modalInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid ${darkTheme.border}`, background: darkTheme.bgInput, color: darkTheme.text, fontFamily: 'inherit', fontSize: 13 };
