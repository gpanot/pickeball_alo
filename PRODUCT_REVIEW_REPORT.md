# CourtMap — Product Review Brief

**Purpose of this document:** Summarize what CourtMap is, who it serves, how it closes market gaps, core flows, a practical test plan (80/20), and a roadmap framed as **impact vs effort**. Intended for an independent product review (e.g. second opinion on roadmap and priorities).

**Sources:** `COURTMAP_PRODUCT_SPEC.md` (v1.1+ trust/safety additions in appendix), mobile and web codebase direction.

**Date:** April 14, 2026

---

## 1. Purpose of the app

**CourtMap** is a pickleball court discovery and booking platform for **Vietnam**, built on a large catalog of venues (on the order of ~2,000 venues and ~10,000 courts) sourced from AloBo-style data. It helps players **find, compare, and book** court time with clear pricing and availability.

The product is evolving from **court-only** booking into a **coach + court marketplace**: players can discover coaches, book sessions that include court time, pay via **VietQR** (bank transfer + proof), and use **coach-scoped credits**. Coaches run their business (availability, partnerships, sessions, subscriptions) from mobile; court owners extend existing web admin to see direct and coach-mediated demand.

**North-star framing:** reduce friction from “I want to play / train” to a **confirmed slot** (court or coach session), with **trust** in listings, pricing, and reviews.

---

## 2. Product functionalities (summary)

### 2.1 Court booking (existing core)

| Area | Capability |
|------|----------------|
| Discovery | Search by location, date, duration, time-of-day; sort by distance, price, rating |
| Map | Pins, clustering, radius search (web: Leaflet; mobile: react-native-maps) |
| Venue detail | Availability grid, pricing tables, info (contact, amenities, social) |
| Booking | Select court + slots → confirm → VietQR → upload payment proof |
| Lifecycle | `pending` → `payment_submitted` → `paid` / `canceled` |
| Player utilities | Saved venues, profile, my bookings |
| Operations | Web admin: venues, courts, slots, pricing, overrides, bookings, payments |
| Data merge | AloBo live overlay where `aloboSlug` exists |

### 2.2 Coach + court marketplace (planned / in progress per spec)

| Area | Capability |
|------|----------------|
| Player | Coach discovery (filters, sort), profile (bio, certs, 4-dimension ratings), book session (date/slot/type), pay VietQR or **credits**, cancel (policy + credit refund rules), rate after session |
| Credits | Coach-specific packs; expiry; refund on cancel per policy; no cross-coach use |
| Coach | Profile, **court partnerships** (self-serve from catalog + **venue invite** flow), weekly availability + overrides, today/schedule/players, session management (auto-confirm, complete, cancel), **payment flag** (2h window, lifetime cap), **subscription** (trial / standard / pro) |
| Court owner (web) | Dashboard + coaches at venue, invites, reports (direct vs coach-mediated), slot blocking |
| Platform revenue | **Flat monthly coach subscription** (not per-session commission) |
| Trust & safety (spec v1.2 direction) | Phone verify at **first published review**; **max 3 coaching hours / player / day**; reviews **private until** 3 completed sessions with that coach **and** phone verified |

---

## 3. Value by user type

### 3.1 Players

- **One place** to browse many courts with realistic pricing and availability signals.
- **Optional coaching path** without leaving the ecosystem: compare coaches, book a time, pay in a familiar local way (VietQR), optionally prepay with packs.
- **Transparency:** fee breakdown (coach + court), clear cancellation/credit rules, and (when implemented) review trust rules.

### 3.2 Coaches

- **Demand and discovery** beyond informal networks; structured profile and ratings.
- **Operations:** calendar, partnerships, session list, payment confirmation path, credit pack sales.
- **Predictable platform cost:** subscription tiers vs opaque take rates.
- **Growth levers:** Pro tier placement / badge eligibility tied to quality signals (per spec).

### 3.3 Court owners

- **Full-funnel visibility:** direct bookings plus coach-driven occupancy.
- **Relationship tools:** invite coaches, manage partnerships, reporting.
- **Inventory control:** maintenance / private blocks (existing + extended concepts in spec).

### 3.4 Platform (CourtMap)

- **Liquidity:** more reasons to open the app (court + coach).
- **Revenue:** coach subscriptions + existing court booking operational value.
- **Data advantage:** large venue catalog as anchor for coach partnerships.

---

## 4. Market gap and how we address it (with flows)

### 4.1 Gaps (problem)

1. **Fragmentation:** Court discovery and booking often happen in chats, Zalo, and ad-hoc transfers; pricing and slot truth are hard to compare.
2. **Coach market is informal:** Hard to compare credentials, availability, and price; payment and no-shows are friction-heavy.
3. **Trust:** Reviews and coach claims are often unverifiable on generic social channels.
4. **Owner visibility:** Venues may not see which demand is “walk-in vs lesson vs event.”

### 4.2 How CourtMap addresses each gap

| Gap | Product response | Primary flow (high level) |
|-----|------------------|---------------------------|
| Fragmented court booking | Unified search + map + structured venue pages + standardized booking + VietQR | Search/map → venue → slots → booking form → pay → proof → confirmed |
| Informal coaching | Coach listings, partnerships tied to **real venues**, session booking with combined fee display | Coach tab → profile → book (date/slot/type) → payment (VietQR or credit) → session appears in “My Bookings” |
| Trust in reviews | Deferred phone verification at review time; delayed public visibility until engagement threshold | Complete session → rate → (first time) OTP modal → review stored; public only when rules met |
| Owner coordination | Admin extension: coaches at venue, invites, session/revenue views | Owner logs admin → coaches → invite / manage → reports |

### 4.3 Economic model (clarifies incentives)

- Player pays **coach** (coach fee + court fee) for coach sessions; coach settles court fee **outside the app** (simple legal/ops boundary).
- Platform charges coaches **subscription**, not per session—aligns with “list and operate” rather than taxing every lesson.

---

## 5. Testing plan — 80% core usage, 20% important variants

*Focus: what real users do most days; exclude extreme abuse, rare race conditions, and exotic device matrices unless already in scope.*

### 5.1 ~80% — core journeys (must pass)

**Player — courts**

1. Search by city/area + date → results sensible → open venue → pick slots → submit booking → VietQR shown → upload proof → booking appears under My Bookings with correct status.
2. Map: pan/zoom, open venue from pin, book flow as above.
3. Save venue → appears in Saved; open from Saved.
4. Cancel **pending** booking (if product allows) and verify slots freed / status updated.

**Player — coaches (when feature is on)**

5. Browse coaches → open profile → see courts, pricing, availability cues → **Book session** → pick date + time + 1:1 vs group → pay (VietQR **or** credit if balance) → session listed under Bookings (Coach segment).
6. Buy credit pack → pay → balance increases → book using credit.
7. Cancel session **within policy** → credit returns (same coach); cancel **late** → no credit (per policy).

**Coach**

8. Register/login → set profile basics → add **court partnership** → set weekly availability → player books → session appears on **Today** → mark complete / view detail.
9. Session paid via VietQR: player submits proof → coach confirms (or uses **flag payment** inside window if not received—spec).

**Court owner (web)**

10. View venue bookings; filter or see coach-mediated sessions (per implementation); send coach invite; accept path on coach device creates partnership.

**Trust (when implemented)**

11. Submit first review → OTP path → review visibility messaging matches rules (private vs public).
12. Attempt **fourth** coaching hour same day → API/UI rejects with clear copy.

### 5.2 ~20% — important non-happy paths (with “if broken, fix this way”)

| Scenario | What to verify | If not correct, target fix |
|----------|----------------|----------------------------|
| Payment deadline expires (court booking) | Booking moves to canceled/failed path; slots reusable | Clear timeout UI + server-side deadline enforcement + idempotent slot release |
| Proof upload fails (network) | Retry preserves booking; no duplicate charges | Optimistic UI with retry; single proof URL update |
| Coach subscription lapsed | Profile hidden; **existing** sessions honored; no new books | Middleware on coach APIs + search index filter + messaging in coach app |
| Coach payment flag (2h window) | Reverts to pending; player notified; counter enforced | Atomic transaction (spec); push/in-app copy |
| Group session | Primary payer pays full amount; optional join/leave if implemented | Copy explains “reimburse outside app”; avoid implying in-app split settlement |
| No slots left mid-checkout | User cannot confirm; clear message | Server validation on POST; client refresh |
| Credits expired | Cannot apply to booking; dashboard shows expiry | Pre-check at booking + credit ledger clarity |
| Venue invite declined | No partnership; owner sees declined state | Invite status sync + coach inbox empty state |
| Reviews before 3 sessions | Review saved; **not** public on coach profile | `isPublic` + API filter + coach-only private label |
| Phone not verified | Reviews remain private until verified | Gate on publish, not on “save draft” |

---

## 6. Product roadmap — impact vs effort

Legend: **Impact** (user value / revenue / strategic leverage), **Effort** (engineering + design + ops). Cells are **suggested priority clusters** for discussion—not commitments.

| Initiative | Impact | Effort | Notes |
|------------|--------|--------|--------|
| **Court booking hardening** (search, map, booking, payments, admin tools) | High — core retention | Medium | Foundation for all trust in the brand |
| **Coach MVP** (profile, partnerships, availability, book + pay, coach today/schedule) | High — new market | High | Unlocks two-sided marketplace |
| **Credits + packs** | Medium–High — LTV, repeat | Medium | Depends on coach MVP path |
| **Coach subscriptions + gating** | High — revenue | Medium | Trial → paid; lapsed coach handling |
| **Court owner admin extension** (invites, coach list, session/revenue views) | Medium — supply-side lock-in | Medium | Helps venues adopt coach flow |
| **Trust & safety v1** (OTP at first review, 3-session visibility, 3h/day cap) | High — differentiation | Medium | Reduces fake reviews; sets brand promise |
| **Reviews (4 dimensions) + aggregation** | Medium — discovery quality | Low–Medium | Coach profile credibility |
| **Notifications** (reminders, payment, invites) | Medium — completion rates | Medium | Open provider choices in spec |
| **Payment flag + abuse limits** | Medium — protects coaches | Low–Medium | Spec’d atomic rules |
| **Localization (EN/VI)** | Medium — Vietnam scale | Medium | Listed as open question in spec |
| **In-app chat** | Medium? — coordination | High | Spec open question; defer unless strong signal |
| **Recurring weekly bookings** | Medium — power users | Medium–High | Spec open question |
| **Coach verification / admin approval** | High for trust, ops cost | Medium | Open question—policy choice |

### 6.1 Suggested sequencing (for reviewer critique)

1. **Stabilize court booking + admin** as the reliability backbone.
2. **Coach MVP + sessions + VietQR** to prove supply and demand in one city/segment.
3. **Credits** to improve repeat usage.
4. **Subscriptions** once coach activity justifies monetization.
5. **Owner tools + reporting** to deepen venue relationships.
6. **Trust & safety** in parallel once reviews go live at scale (or immediately if reviews ship with MVP).

---

## 7. Open product decisions (from spec)

Worth explicit reviewer input:

- Coach **verification** before going live (yes/no; level of friction).
- **Chat** vs status quo (off-app messaging).
- **Recurring sessions** priority vs one-off bookings.
- **Notification** stack (Expo Push vs FCM/APNs specifics).
- **Multi-language** scope and timeline.

---

## 8. What we want back from review

1. **Prioritization:** Would you reorder the impact/effort table for Vietnam pickleball specifically?
2. **MVP cut:** Minimum coach+court slice that still feels trustworthy to players.
3. **Risk register:** Top 5 product risks (trust, payments, double-booking, subscription churn, owner adoption) and mitigations.
4. **Metrics:** North-star and guardrails (e.g. confirmed sessions / week, payment confirmation time, coach active weekly, repeat booking rate).

---

*End of brief.*
