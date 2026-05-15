'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { darkTheme, type ThemeTokens } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import { formatVndFull } from '@/lib/formatters';

const t: ThemeTokens = darkTheme;

type CoachPublic = {
  id: string;
  name: string;
  phone: string;
  ratingOverall: number | null;
};

type CoachCourtLinkRow = {
  id: string;
  coachId: string;
  venueId: string;
  courtIds: string[];
  isActive: boolean;
  coach: CoachPublic;
};

type CoachSessionBrief = {
  id: string;
  coachId: string;
  date: string;
};

type MarketplaceCoach = {
  id: string;
  name: string;
  phone: string;
  photo: string | null;
  bio: string | null;
  specialties: string[];
  ratingOverall: number | null;
  reviewCount: number;
  hourlyRate1on1: number;
  hourlyRateGroup: number | null;
  experienceBand: string | null;
  courtLinks: { venue: { id: string; name: string } }[];
};

type TabMode = 'venue' | 'marketplace';

function StarRating({ value }: { value: number | null }) {
  if (value == null) return <span style={{ fontSize: 12, color: t.textMuted }}>No rating</span>;
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span style={{ fontSize: 13, color: t.accent, fontWeight: 700 }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      <span style={{ fontSize: 12, color: t.textSec, fontWeight: 600, marginLeft: 4 }}>{value.toFixed(1)}</span>
    </span>
  );
}

export default function AdminCoachesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [tab, setTab] = useState<TabMode>('venue');

  // Venue coaches state
  const [links, setLinks] = useState<CoachCourtLinkRow[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Marketplace state
  const [allCoaches, setAllCoaches] = useState<MarketplaceCoach[]>([]);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpSearch, setMpSearch] = useState('');
  const [mpTotal, setMpTotal] = useState(0);

  // Invite state
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [invitePhoneBusy, setInvitePhoneBusy] = useState(false);
  const [invitePhoneMsg, setInvitePhoneMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleAuthFail = useCallback(() => {
    clearAdminSession();
    router.replace('/admin');
  }, [router]);

  const loadVenueCoaches = useCallback(() => {
    const s = readAdminSession();
    if (!s) { setSession(null); setLoading(false); return; }
    setSession(s);
    setLoading(true);
    const base = `/api/admin/venues/${encodeURIComponent(s.venueId)}`;
    const h = adminAuthHeaders(s.token);

    Promise.all([
      fetch(`${base}/coaches`, { headers: h }).then((r) => {
        if (r.status === 401) { handleAuthFail(); return null; }
        if (!r.ok) throw new Error();
        return r.json() as Promise<CoachCourtLinkRow[]>;
      }),
      fetch(`${base}/sessions?limit=500`, { headers: h }).then((r) => {
        if (r.status === 401) { handleAuthFail(); return null; }
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ sessions: CoachSessionBrief[] }>;
      }),
    ])
      .then(([coachRows, sessPayload]) => {
        if (!coachRows || !sessPayload) return;
        setLinks(Array.isArray(coachRows) ? coachRows : []);
        const sessions = Array.isArray(sessPayload.sessions) ? sessPayload.sessions : [];
        const counts: Record<string, number> = {};
        for (const row of sessions) counts[row.coachId] = (counts[row.coachId] ?? 0) + 1;
        setSessionCounts(counts);
      })
      .catch(() => { setLinks([]); setSessionCounts({}); })
      .finally(() => setLoading(false));
  }, [handleAuthFail]);

  const loadMarketplace = useCallback((search: string) => {
    setMpLoading(true);
    const params = new URLSearchParams({ limit: '50', sort: 'rating' });
    if (search.trim()) params.set('q', search.trim());
    fetch(`/api/coaches?${params}`)
      .then((r) => r.json())
      .then((data: { coaches: MarketplaceCoach[]; total: number }) => {
        setAllCoaches(Array.isArray(data.coaches) ? data.coaches : []);
        setMpTotal(data.total ?? 0);
      })
      .catch(() => { setAllCoaches([]); setMpTotal(0); })
      .finally(() => setMpLoading(false));
  }, []);

  useEffect(() => { loadVenueCoaches(); }, [loadVenueCoaches]);

  useEffect(() => {
    if (tab === 'marketplace') {
      const tmr = setTimeout(() => loadMarketplace(mpSearch), mpSearch ? 300 : 0);
      return () => clearTimeout(tmr);
    }
  }, [tab, mpSearch, loadMarketplace]);

  const venueCoachIds = new Set(links.map((l) => l.coachId));

  const inviteCoach = async (coachPhone: string, coachId: string) => {
    if (!session) return;
    setInviteBusy(coachId);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/admin/venues/${encodeURIComponent(session.venueId)}/coaches`, {
        method: 'POST',
        headers: adminAuthHeaders(session.token),
        body: JSON.stringify({ coachPhone }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) { handleAuthFail(); return; }
      if (!res.ok) { setInviteMsg({ id: coachId, type: 'err', text: data.error ?? 'Invite failed' }); return; }
      setInviteMsg({ id: coachId, type: 'ok', text: 'Invited!' });
      loadVenueCoaches();
    } catch { setInviteMsg({ id: coachId, type: 'err', text: 'Network error' }); }
    finally { setInviteBusy(null); }
  };

  const sendPhoneInvite = async () => {
    if (!session) return;
    const phone = invitePhone.trim();
    if (!phone) { setInvitePhoneMsg({ type: 'err', text: 'Enter a phone number.' }); return; }
    setInvitePhoneBusy(true);
    setInvitePhoneMsg(null);
    try {
      const res = await fetch(`/api/admin/venues/${encodeURIComponent(session.venueId)}/coaches`, {
        method: 'POST',
        headers: adminAuthHeaders(session.token),
        body: JSON.stringify({ coachPhone: phone }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) { handleAuthFail(); return; }
      if (!res.ok) { setInvitePhoneMsg({ type: 'err', text: data.error ?? 'Invite failed.' }); return; }
      setInvitePhoneMsg({ type: 'ok', text: 'Invite sent!' });
      setInvitePhone('');
      loadVenueCoaches();
    } catch { setInvitePhoneMsg({ type: 'err', text: 'Network error.' }); }
    finally { setInvitePhoneBusy(false); }
  };

  if (!session && !loading) return null;

  return (
    <div>
      <style>{`@keyframes cm-admin-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Coaches</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => { setInviteOpen(true); setInvitePhoneMsg(null); }}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: t.accent, color: '#0a0a0a', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Invite by phone
          </button>
          <div style={{ display: 'flex', gap: 2, background: t.bgSurface, borderRadius: 8, padding: 2, border: `1px solid ${t.border}` }}>
            {(['venue', 'marketplace'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setTab(m)}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: tab === m ? t.blue : 'transparent', color: tab === m ? '#fff' : t.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {m === 'venue' ? 'My coaches' : 'Browse all'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── VENUE COACHES TAB ── */}
      {tab === 'venue' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48, color: t.textSec }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${t.border}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'cm-admin-spin 0.75s linear infinite' }} />
              <span>Loading…</span>
            </div>
          ) : links.length === 0 ? (
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 32, textAlign: 'center', color: t.textSec }}>
              No coaches linked yet. Use <strong style={{ color: t.text }}>Browse all</strong> to find and invite coaches, or invite by phone number.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {links.map((row) => {
                const rating = row.coach.ratingOverall != null && !Number.isNaN(row.coach.ratingOverall) ? row.coach.ratingOverall.toFixed(1) : '—';
                const sessN = sessionCounts[row.coachId] ?? 0;
                return (
                  <Link key={row.id} href={`/admin/coaches/${row.coachId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: t.accent, flexShrink: 0 }}>
                        {row.coach.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{row.coach.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: row.isActive ? t.green : t.textMuted, background: row.isActive ? `${t.green}18` : `${t.textMuted}18`, padding: '1px 6px', borderRadius: 4 }}>
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: t.textSec, marginTop: 2 }}>
                          <a href={`tel:${row.coach.phone}`} style={{ color: t.blue, textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>{row.coach.phone}</a>
                          <span>★ {rating}</span>
                          <span>{sessN} session{sessN !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: t.textMuted }}>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── MARKETPLACE TAB ── */}
      {tab === 'marketplace' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <input type="search" placeholder="Search coaches by name…" value={mpSearch} onChange={(e) => setMpSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontFamily: 'inherit', fontSize: 13 }} />
          </div>

          {mpLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48, color: t.textSec }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${t.border}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'cm-admin-spin 0.75s linear infinite' }} />
              <span>Searching coaches…</span>
            </div>
          ) : allCoaches.length === 0 ? (
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 32, textAlign: 'center', color: t.textSec }}>
              No coaches found.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>{mpTotal} coach{mpTotal !== 1 ? 'es' : ''} available</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                {allCoaches.map((c) => {
                  const alreadyLinked = venueCoachIds.has(c.id);
                  const isBusy = inviteBusy === c.id;
                  const msg = inviteMsg?.id === c.id ? inviteMsg : null;
                  return (
                    <div key={c.id} style={{ background: t.bgCard, border: `1px solid ${alreadyLinked ? t.green + '55' : t.border}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Top row: avatar + name + rate */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: t.accent, flexShrink: 0, overflow: 'hidden' }}>
                          {c.photo
                            ? <img src={c.photo} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} />
                            : c.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>
                            <a href={`tel:${c.phone}`} style={{ color: t.blue, textDecoration: 'none' }}>{c.phone}</a>
                          </div>
                          <StarRating value={c.ratingOverall} />
                          {c.reviewCount > 0 && <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 4 }}>({c.reviewCount})</span>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{formatVndFull(c.hourlyRate1on1)}</div>
                          <div style={{ fontSize: 10, color: t.textMuted }}>/ hour 1:1</div>
                          {c.hourlyRateGroup != null && (
                            <div style={{ fontSize: 11, color: t.textSec, marginTop: 2 }}>{formatVndFull(c.hourlyRateGroup)} group</div>
                          )}
                        </div>
                      </div>

                      {/* Specialties */}
                      {c.specialties.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {c.specialties.slice(0, 4).map((s) => (
                            <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: t.accentBg, border: `1px solid ${t.border}`, color: t.textSec, fontWeight: 600 }}>{s}</span>
                          ))}
                          {c.specialties.length > 4 && <span style={{ fontSize: 10, color: t.textMuted }}>+{c.specialties.length - 4}</span>}
                        </div>
                      )}

                      {/* Bio */}
                      {c.bio && (
                        <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.bio}
                        </div>
                      )}

                      {/* Venues they work at */}
                      {c.courtLinks.length > 0 && (
                        <div style={{ fontSize: 11, color: t.textMuted }}>
                          Works at: {c.courtLinks.map((l) => l.venue.name).join(', ')}
                        </div>
                      )}

                      {/* Invite / status */}
                      <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                        {alreadyLinked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: t.green }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.green, display: 'inline-block' }} />
                            Already at your venue
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button type="button" disabled={isBusy}
                              onClick={() => inviteCoach(c.phone, c.id)}
                              style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: t.accent, color: '#0a0a0a', fontWeight: 700, fontSize: 12, cursor: isBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                              {isBusy ? 'Inviting…' : 'Invite to venue'}
                            </button>
                            {msg && <span style={{ fontSize: 12, color: msg.type === 'ok' ? t.green : t.red }}>{msg.text}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Phone invite modal */}
      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: t.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !invitePhoneBusy && setInviteOpen(false)}>
          <div style={{ width: '100%', maxWidth: 400, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, boxShadow: t.shadow }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Invite coach by phone</h2>
            <label style={{ display: 'block', fontSize: 12, color: t.textSec, marginBottom: 6 }}>Phone number</label>
            <input type="tel" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+84…"
              disabled={invitePhoneBusy}
              style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontFamily: 'inherit', fontSize: 13, marginBottom: 12 }} />
            {invitePhoneMsg && (
              <div style={{ marginBottom: 10, fontSize: 13, color: invitePhoneMsg.type === 'ok' ? t.green : t.red }}>{invitePhoneMsg.text}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" disabled={invitePhoneBusy} onClick={() => setInviteOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSec, fontFamily: 'inherit', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" disabled={invitePhoneBusy} onClick={() => void sendPhoneInvite()}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: t.accent, color: '#0a0a0a', fontWeight: 700, fontFamily: 'inherit', cursor: invitePhoneBusy ? 'wait' : 'pointer' }}>
                {invitePhoneBusy ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
