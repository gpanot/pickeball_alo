# CourtMap — Product Specification

**Version:** 1.1  
**Date:** April 6, 2026  
**Product:** CourtMap (Pickleball Vietnam)  
**Status:** Current State + Coach+Court Booking System (New Feature)

---

## Changelog

### v1.1 — April 6, 2026
- Added coach subscription model (trial / standard / pro)
- Added payment flag mechanism (coach flags non-payment within 2hr window)
- Upgraded rating system to 4 dimensions (On time / Friendly / Professional / Recommend)
- Added dual court partnership model (coach self-selection + court owner invite flow)

---

## Table of Contents

1. [Current App Overview](#1-current-app-overview)
2. [Tech Stack](#2-tech-stack)
2b. [React Native / Expo Development Standards](#2b-react-native--expo-development-standards)
3. [Current Data Model](#3-current-data-model)
4. [Current Booking Flow](#4-current-booking-flow)
5. [New Feature: Coach + Court Booking System](#5-new-feature-coach--court-booking-system)
6. [User Roles](#6-user-roles)
7. [Credit System](#7-credit-system)
7b. [Platform Revenue — Coach Subscriptions](#7b-platform-revenue--coach-subscriptions)
8. [Payment Flow](#8-payment-flow)
9. [UI/UX Design — Player (Mobile)](#9-uiux-design--player-mobile)
10. [UI/UX Design — Coach (Mobile)](#10-uiux-design--coach-mobile)
11. [UI/UX Design — Court Owner (Web)](#11-uiux-design--court-owner-web)
12. [New Data Models](#12-new-data-models)
13. [New API Endpoints](#13-new-api-endpoints)
14. [Screen Inventory](#14-screen-inventory)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. Current App Overview

**CourtMap** is a pickleball court discovery and booking platform for Vietnam. It helps players find, compare, and book courts across nearly 2,000 venues scraped from the AloBo platform (`datlich.alobo.vn`).

### Current Features

| Feature | Description |
|---------|-------------|
| **Court Search** | Search venues by location, date, duration, and time-of-day (morning/noon/afternoon/night). Sort by distance, price, or rating. |
| **Map Explore** | Interactive Leaflet map (web) / React Native Maps (mobile) with venue pins, clustering, and radius search. |
| **Venue Detail** | Tabs for Availability (live slot grid), Pricing (structured time-band tables), and Info (address, phone, social links, amenities). |
| **Slot Booking** | Select time slots on specific courts → confirm → VietQR payment with 5-minute deadline → upload payment proof. |
| **My Bookings** | View, edit (pending only), or cancel bookings. Status lifecycle: `pending → payment_submitted → paid → canceled`. |
| **Saved Venues** | Bookmark venues for quick access. Stored in localStorage (web) and synced via UserProfile (server). |
| **User Profile** | Name, phone, dark mode toggle. Anonymous userId generated client-side. |
| **Admin Panel** | Web-only dashboard at `/admin/*` for managing venues, courts, slots, pricing, date overrides, bookings, and payments. |
| **AloBo Live Overlay** | Real-time slot availability from AloBo API, merged with local DB data for venues with `aloboSlug`. |

### Current Navigation Structure

**Web:** Single-page app at `/` with in-memory screen state (`search | results | map | maps | saved | bookings | profile`). VenueDetail slides up as an overlay.

**Mobile (Expo):** Tab-based with Bottom Nav → Book / Maps / Saved / Bookings. Venue detail opens as a transparent modal stack screen at `venue/[id]`.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web App** | Next.js 15, React 19, TypeScript |
| **Mobile App** | Expo ~54, React Native 0.81, expo-router |
| **Styling** | Inline styles + global CSS (web), React Native StyleSheet (mobile) |
| **Maps** | Leaflet (web), react-native-maps (mobile) |
| **Database** | PostgreSQL via Prisma 6 |
| **Auth** | Anonymous userId (players), Bearer token (admin) |
| **Payments** | VietQR (bank transfer + QR code + proof upload) |
| **Hosting** | Vercel (web + API), Neon (PostgreSQL) |
| **Data Source** | AloBo scraping (1,976 venues, 10,581 courts) with AES-CBC decryption |

---

## 2b. React Native / Expo Development Standards

These rules apply to every new screen and component built for the coach marketplace feature. They exist to prevent web-to-RN patching debt.

---

### Component-first rule

Before writing any screen, identify the primitive components it needs and build or confirm those exist first.

Every screen must be composed of named, reusable components. No inline anonymous JSX blocks longer than ~20 lines inside a screen file. If a UI element appears on more than one screen, it lives in `components/` before the second screen is built.

**Required components to create before Phase 2 begins** (added to Phase 1 checklist):

| Component | Used on |
|-----------|---------|
| `CoachCard` | CoachListScreen, search results |
| `SessionCard` | CoachTodayScreen, BookingsScreen |
| `CreditBadge` | CoachProfileScreen, MyCreditsScreen, SessionDetailScreen |
| `RatingBar` | 4-dimension rating display: CoachProfileScreen, RateSessionScreen |
| `StarRating` | Interactive 1–5 star input: RateSessionScreen |
| `VietQRBlock` | QR image + bank details + copy buttons + "I have paid" button: SessionPaymentScreen, BuyCreditPackScreen |
| `TimeSlotGrid` | Reuse from existing court booking flow |
| `DatePicker` | Reuse from existing court booking flow |
| `SectionHeader` | Label + optional right action link |
| `EmptyState` | Illustration placeholder + title + subtitle + optional CTA button |
| `BottomSheet` | Wrapper with handle bar, used for all modal sheets (cancel, flag payment, group size) |
| `StatusChip` | Confirmed / pending / cancelled / verifying with colour variants |

---

### Platform rules — no web primitives in RN files

Never use in `.tsx` files under `app/` or `components/` targeting mobile:

- No `<div>`, `<span>`, `<p>`, `<a>`, `<img>`, `<input>`, `<button>`
- No `onClick` — use `onPress`
- No CSS classes or `className` — use `StyleSheet.create()` or a theme utility
- No `position: fixed` — use `position: absolute` with awareness of safe area
- No `vh` / `vw` units — use `Dimensions.get('window')` or Flexbox
- No hover states — RN has no hover, use pressed states via `Pressable`
- No `overflow: scroll` on a plain `View` — use `ScrollView` or `FlatList` explicitly

---

### Shared code between web and mobile

If a file is shared between Next.js (web) and Expo (mobile), it must contain zero platform-specific imports.

**Safe to share:** types, constants, API call functions (using `fetch`), Prisma types, utility functions, validation logic.

**Not safe to share:** anything that imports from `react-native`, `expo-*`, `next/*`, or uses `document` / `window`.

Use platform extensions when behaviour genuinely differs:

```
component.native.tsx  → RN version
component.web.tsx     → web version
component.tsx         → shared fallback
```

---

### Navigation — expo-router conventions

- Every new screen is a file under `app/(tabs)/` or `app/(stack)/`
- No programmatic navigation using ref hacks — use `router.push()`, `router.replace()`, `router.back()`
- Tab screens use layout files — do not nest tab logic inside screen components
- Modal/sheet screens use `presentation: 'transparentModal'` in the layout, not custom overlay state

---

### Safe area

Every screen root must be wrapped in `SafeAreaView` from `react-native-safe-area-context`, not the deprecated version from `react-native`.

Bottom tab bar and sticky bottom CTAs must respect bottom safe area inset — use `useSafeAreaInsets()` and add the inset value to the container's `paddingBottom`. Do not hardcode `34px`.

---

### FlatList over ScrollView for lists

Any list that could exceed 10 items must use `FlatList` (or `FlashList` from `@shopify/flash-list` for performance), not `ScrollView` with mapped children.

Applies to: `CoachListScreen`, `MyCreditsScreen`, `CoachPlayersScreen`, `BookingsScreen` session lists.

---

### Theme tokens — no hardcoded colours or sizes

All colours, font sizes, spacing, and border radii must reference the theme object from `lib/theme.ts` (shared) or `mobile/lib/theme.ts` (mobile-specific).

- No hardcoded hex values in component files.
- No hardcoded pixel values for spacing — use `theme.spacing`.
- If a new token is needed, add it to `theme.ts` first, then use it. Never introduce a one-off magic number in a component file.

---

## 3. Current Data Model

```
Venue (1,976 records)
├── id, name, address, lat, lng, phone, hours
├── rating, reviewCount, priceMin, priceMax
├── tags[], amenities[], images[]
├── socialUrls (facebook, instagram, tiktok, google)
├── hasMemberPricing, use30MinSlots, aloboSlug
├── Court[] (10,581 total)
│   ├── id, name, note, isAvailable, aloboId
│   └── TimeSlot[]
│       └── id, date, time, price, memberPrice, isBooked
├── PricingTable[]
│   └── name, dayTypes[], rows (JSON: startTime, endTime, walkIn, member)
├── DateOverride[]
│   └── date, dayType, note
├── VenuePayment[]
│   └── bank, accountName, accountNumber, qrImageUrl, bankBin
└── Booking[]
    ├── orderId, userId, userName, userPhone
    ├── date, slots (JSON), totalPrice, notes
    ├── status (pending | payment_submitted | paid | canceled)
    ├── paymentProofUrl, paymentDeadline
    └── paymentSubmittedAt, paymentConfirmedAt

UserProfile
└── id, name, phone (unique), savedVenues[]
```

---

## 4. Current Booking Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Search /   │────▶│ Venue Detail  │────▶│ Select Slots  │────▶│ Booking Form   │────▶│ VietQR Pay   │
│   Browse     │     │ (Availability)│     │ (Court+Time)  │     │ (Name, Phone)  │     │ (5 min limit)│
└─────────────┘     └──────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                                                                           │
                                                                                           ▼
                                                                                    ┌──────────────┐
                                                                                    │ Upload Proof  │
                                                                                    │ → Admin Review│
                                                                                    └──────────────┘
```

**Status Lifecycle:**
- `pending` → Player reserved slots, payment deadline running (5 min)
- `payment_submitted` → Player uploaded proof, waiting for admin review
- `paid` → Admin confirmed payment
- `canceled` → Player or admin canceled; slots freed

---

## 5. New Feature: Coach + Court Booking System

### Vision

Transform CourtMap from a court-only booking platform into a **coach + court marketplace**. Players can discover coaches, book coaching sessions that include court time, and pay via the existing VietQR system. Coaches manage their availability, preferred courts, and session pricing. Court owners manage their venues and see all bookings (direct + coach-mediated).

### Key Principles

1. **Coach + court partnership** — Two ways a coach is linked to a venue: (a) Self-selection: Coach searches venues from the 1,976 catalog by radius from their base location and requests to add a court partnership. (b) Court owner invite: Court owner proactively invites a coach to their venue from the admin panel. Coach receives a notification and accepts or declines. Both methods create a CoachCourtLink record. Either party can deactivate the link.
2. **Credit system** — Players can buy credit packs with specific coaches or pay per session. Cancellations refund a credit (same coach only).
3. **Coach handles court payment** — The player pays the full amount (coach fee + court fee) to the coach via VietQR. The coach is responsible for paying the court owner separately.
4. **Group sessions** — Coaches can offer both 1-on-1 and group sessions (2–4 players). The primary player pays the full amount (coach + court) in one transaction via VietQR or credit. Friends reimburse the primary player outside the app — no in-app cost splitting.
5. **Three user roles** — Player (mobile), Coach (mobile), Court Owner (web admin extension).

---

## 6. User Roles

### 6.1 Player (Mobile — Expo App)

The existing mobile user, extended with coach discovery and booking capabilities.

| Capability | Description |
|------------|-------------|
| Browse coaches | Search/filter coaches by location, sport specialty, skill level, rating, price range |
| View coach profile | See bio, certifications, ratings/reviews, pricing, specialties, available courts |
| Book session | Select coach → pick date/time → choose session type (1-on-1 or group) → pay |
| Credit management | Buy credit packs, view balance per coach, use credits to book |
| Cancel session | Get +1 credit back (same coach only), subject to cancellation policy |
| Rate & review | Leave a 4-dimension rating after each completed session. Dimensions: On time (did coach start on schedule?) / Friendly (was coach approachable?) / Professional (was coaching quality high?) / Recommend (would you recommend this coach?). Each dimension rated 1–5 stars independently. Optional written review (150 chars). |
| Book courts (existing) | Continue using current court-only booking flow |

### 6.2 Coach (Mobile — Expo App)

A new user type with their own mobile experience (same Expo app, role-based navigation).

| Capability | Description |
|------------|-------------|
| Profile setup | Name, photo, bio, certifications, specialties, pricing tiers |
| Court partnerships | Select which venues/courts they coach at (from the 1,976 venue catalog) |
| Availability | Set weekly recurring schedule + date-specific overrides |
| Session management | View upcoming/past sessions, cancel, mark complete. Bookings are auto-approved — no manual accept/decline for better UX. |
| Earnings dashboard | Track income, sessions count, credit pack sales |
| Player management | See player list, session history, credits outstanding |
| Receive payments | VietQR payment from players for (coach fee + court fee) |

### 6.3 Court Owner (Web — Admin Panel Extension)

Extends the existing `/admin` panel with a court-owner role.

| Capability | Description |
|------------|-------------|
| Venue dashboard | See all bookings (direct player + coach-mediated) on their courts |
| Court management | Manage courts, availability, pricing (existing admin features) |
| Coach directory | See which coaches operate at their venue |
| Invite coaches | Send an invite to a coach by phone number or coach profile link. Coach receives push notification and can accept or decline from their mobile app. |
| Manage partnerships | See all active coach links, deactivate a coach from their venue if needed. |
| Revenue reports | Track occupancy, revenue from direct bookings vs. coach sessions |
| Slot blocking | Block slots for maintenance, events, or private use |

---

## 7. Credit System

### How It Works

Credits are **coach-specific** — a credit purchased for Coach A can only be used with Coach A.

```
┌──────────────────────────────────────────────────────────┐
│                    CREDIT LIFECYCLE                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ACQUIRE                                                 │
│  ├── Buy a credit pack  (e.g. 5 sessions = 5 credits)   │
│  └── Pay per session    (1 session = 1 credit deducted)  │
│                                                          │
│  USE                                                     │
│  └── Book 1 session with Coach A = -1 credit             │
│                                                          │
│  REFUND                                                  │
│  └── Cancel a session = +1 credit (same coach only)      │
│      ⚠ Cancellation policy: min 24h before session       │
│                                                          │
│  EXPIRY                                                  │
│  └── Credits expire after 90 days from purchase           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Credit Pack Example

| Pack | Credits | Price (VND) | Per Session | Savings |
|------|---------|-------------|-------------|---------|
| Single | 1 | 500,000 | 500,000 | — |
| 5-Pack | 5 | 2,250,000 | 450,000 | 10% |
| 10-Pack | 10 | 4,000,000 | 400,000 | 20% |

Coaches set their own pricing tiers. The table above is an example — each coach defines their own packs.

### Credit Rules

1. **Coach-scoped**: Credits for Coach A cannot be used with Coach B.
2. **Cancellation refund**: Canceling a session refunds 1 credit, but only for future bookings with the same coach. No cash refund.
3. **Late cancellation**: Cancellations within 24h of the session do NOT refund a credit (configurable by coach).
4. **Expiry**: Credits expire 90 days after purchase (configurable by coach, minimum 30 days).
5. **Non-transferable**: Credits cannot be transferred between players or between coaches.

---

## 7b. Platform Revenue — Coach Subscriptions

CourtMap earns from coaches via a flat monthly subscription. No per-session commission. No payment processing involvement.

### Plans

| Plan | Price | Features |
|------|-------|----------|
| **Trial** | Free for 30 days | All features. Limited to 10 bookings. Auto-prompts to upgrade after trial ends. |
| **Standard** | 199,000 VND/month | Unlimited bookings. Full profile. Calendar. Push + Zalo notifications. Basic earnings view. |
| **Pro** | 299,000 VND/month | Everything in Standard + priority placement in search results + Top Coach badge eligibility (requires 4.8+ rating, 50+ sessions, <3% cancellation rate) + detailed analytics. |

### Billing

Coach pays monthly via VietQR — the same payment method they already use for everything.

### Lapsed Subscription

If a subscription lapses:
- Coach profile goes **inactive** — no longer visible to players in search results.
- No new bookings can be made.
- Existing confirmed bookings are **honoured** until their session date.
- Coach can re-activate at any time by paying for the next month.

---

## 8. Payment Flow

### Coach Session Booking

```
┌─────────┐                    ┌─────────┐                    ┌─────────────┐
│  PLAYER  │                    │  COACH   │                    │ COURT OWNER  │
└────┬─────┘                    └────┬─────┘                    └──────┬──────┘
     │                               │                                │
     │  1. Book session              │                                │
     │  (coach fee + court fee)      │                                │
     │──────────────────────────────▶│                                │
     │                               │                                │
     │  2. Pay via VietQR            │                                │
     │  (total = coach + court)      │                                │
     │──────────────────────────────▶│                                │
     │                               │                                │
     │  3. Upload payment proof      │                                │
     │──────────────────────────────▶│                                │
     │                               │  4. Coach confirms receipt     │
     │                               │──────────────────────────────▶ │
     │                               │                                │
     │                               │  5. Coach pays court fee       │
     │                               │  (separate, outside app)       │
     │                               │──────────────────────────────▶ │
     │                               │                                │
     │  6. Session confirmed         │                                │
     │◀──────────────────────────────│                                │
     │                               │                                │
```

### Payment Not Received

If a player taps "I've paid" but the coach checks their bank and the transfer is not there, the coach can flag the booking within 2 hours of the "I've paid" tap.

**Flow:**
1. Coach sees session card with status "Payment submitted"
2. Coach taps "Payment not received" (visible for 2hrs only)
3. Confirmation sheet explains: booking will be cancelled, player's credit is not issued (if credit payment), player is notified to retry or cancel
4. Coach confirms → booking status reverts to `pending`
5. Player receives push: "Coach [Name] could not confirm your payment. Please pay again or cancel your booking."

**Rules:**
- Coach can only flag a maximum of **3 times total** across all bookings (prevents abuse). The lifetime count lives on the `Coach` model (`paymentFlagCount`), not on individual sessions.
- When a flag is submitted, the API must **atomically** (single transaction): (1) check `Coach.paymentFlagCount < 3`, (2) set `CoachSession.paymentFlaggedAt = now()`, (3) increment `Coach.paymentFlagCount += 1`, (4) revert session `paymentStatus` to `pending`.
- After 2 hours from the player's "I've paid" tap, the flag option disappears — session is assumed confirmed.

### Payment Breakdown Display (Player View)

```
┌─────────────────────────────────────┐
│         Payment Summary             │
├─────────────────────────────────────┤
│ Coach: Nguyen Van A                 │
│ Date: April 10, 2026               │
│ Time: 18:00 – 19:00                │
│ Court: 65th Street – Sân 1         │
│ Session: 1-on-1                    │
├─────────────────────────────────────┤
│ Coach fee          350,000 VND      │
│ Court fee          150,000 VND      │
│ ─────────────────────────────       │
│ Total              500,000 VND      │
├─────────────────────────────────────┤
│ 💳 Pay to: Coach Nguyen Van A      │
│ [Pay with Credit (3 remaining)]     │
│ [Pay with VietQR]                   │
└─────────────────────────────────────┘
```

For **group sessions**, the primary player pays the full amount. Friends reimburse outside the app:

```
┌─────────────────────────────────────┐
│   Group Session (you + 2 friends)   │
├─────────────────────────────────────┤
│ Coach fee (full)       600,000      │
│ Court fee (full)       150,000      │
│ ─────────────────────────────       │
│ Total you pay          750,000 VND  │
├─────────────────────────────────────┤
│ 💡 Suggested split: 250,000 / person│
│    Collect from friends outside app │
└─────────────────────────────────────┘
```

---

## 9. UI/UX Design — Player (Mobile)

### 9.1 Updated Navigation

The bottom tab bar gains a **Coach** tab. The existing tabs remain.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              [Current Screen Content]            │
│                                                  │
├────────┬─────────┬─────────┬──────────┬──────────┤
│  Book  │  Coach  │  Maps   │ Bookings │  Saved   │
│  🏓   │  🎓    │  🗺    │  📋     │  ♡      │
└────────┴─────────┴─────────┴──────────┴──────────┘
```

### 9.2 Coach Discovery Screen (New Tab)

```
┌──────────────────────────────────────┐
│ ◀  Find a Coach                   🔍 │
├──────────────────────────────────────┤
│                                      │
│  📍 Near: Ho Chi Minh City      ▼   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🔍 Search coaches...         │    │
│  └──────────────────────────────┘    │
│                                      │
│  Specialties:                        │
│  ┌────────┐ ┌──────────┐ ┌───────┐  │
│  │Beginner│ │ Advanced │ │ Drills│  │
│  └────────┘ └──────────┘ └───────┘  │
│  ┌────────────┐ ┌───────────────┐   │
│  │ Match Play │ │ Kids / Junior │   │
│  └────────────┘ └───────────────┘   │
│                                      │
│  Sort: ⭐ Rating  💰 Price  📍 Near │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ ┌────┐  Coach Nguyen Van A      ││
│  │ │ 📷 │  ⭐ 4.8 (32 reviews)    ││
│  │ │    │  IPTPA Level 2           ││
│  │ └────┘  Beginner · Drills       ││
│  │         From 400,000 VND/h      ││
│  │         📍 65th Street PB       ││
│  │         🟢 Available today      ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │ ┌────┐  Coach Tran Thi B        ││
│  │ │ 📷 │  ⭐ 4.9 (18 reviews)    ││
│  │ │    │  PPR Certified           ││
│  │ └────┘  Advanced · Match Play   ││
│  │         From 600,000 VND/h      ││
│  │         📍 Sunrise PB Club      ││
│  │         Next: April 8           ││
│  └──────────────────────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

### 9.3 Coach Profile Screen

```
┌──────────────────────────────────────┐
│ ◀                                    │
├──────────────────────────────────────┤
│         ┌──────────────┐             │
│         │              │             │
│         │   Coach      │             │
│         │   Photo      │             │
│         │              │             │
│         └──────────────┘             │
│                                      │
│   Coach Nguyen Van A                 │
│   IPTPA Level 2 · PPR Certified     │
│                                      │
│   On time        ████████░░ 4.2      │
│   Friendly       █████████░ 4.7      │
│   Professional   ████████░░ 4.1      │
│   Recommend      █████████░ 4.8      │
│   Overall ⭐ 4.5 (32 reviews)       │
│                                      │
│   "5 years coaching experience.      │
│    Specializing in beginners and     │
│    advanced drill techniques."       │
│                                      │
├──────────────────────────────────────┤
│  Specialties                         │
│  ┌──────────┐ ┌────────┐ ┌───────┐  │
│  │ Beginner │ │ Drills │ │ Dinks │  │
│  └──────────┘ └────────┘ └───────┘  │
│                                      │
├──────────────────────────────────────┤
│  Courts                              │
│  📍 65th Street Pickleball (2.1 km) │
│  📍 Sunrise Pickleball Club (4.5 km)│
│                                      │
├──────────────────────────────────────┤
│  Pricing                             │
│  ┌──────────────────────────────┐    │
│  │ 1-on-1   500,000 VND / hour │    │
│  │ Group    250,000 VND / person│    │
│  │ (2–4 players)               │    │
│  └──────────────────────────────┘    │
│                                      │
│  Credit Packs                        │
│  ┌──────────────────────────────┐    │
│  │ 5 sessions   2,250,000   -10% │   │
│  │ 10 sessions  4,000,000   -20% │   │
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│  Availability — April 2026          │
│                                      │
│  ┌──┬──┬──┬──┬──┬──┬──┐            │
│  │Mo│Tu│We│Th│Fr│Sa│Su│            │
│  ├──┼──┼──┼──┼──┼──┼──┤            │
│  │  │ 8│ 9│10│11│12│13│            │
│  │  │  │🟢│🟢│  │🟢│🟢│           │
│  ├──┼──┼──┼──┼──┼──┼──┤            │
│  │14│15│16│17│18│19│20│            │
│  │  │  │🟢│🟢│  │🟢│🟢│           │
│  └──┴──┴──┴──┴──┴──┴──┘            │
│                                      │
│  ┌──────────────────────────────────┐│
│  │       [ Book a Session ]          ││
│  └──────────────────────────────────┘│
│                                      │
├──────────────────────────────────────┤
│  Reviews                             │
│                                      │
│  ⭐⭐⭐⭐⭐  "Great coach! Very     │
│  patient with beginners."            │
│  — Player Mai, March 2026            │
│                                      │
│  ⭐⭐⭐⭐  "Good drills, would      │
│  book again. Court was a bit far."   │
│  — Player Hung, February 2026        │
│                                      │
└──────────────────────────────────────┘
```

### 9.4 Session Booking Screen (Player)

Single screen — no intermediate navigation steps. Calendar at top, time slots appear below when a date is tapped, session type selector below that, sticky Continue button at the bottom.

```
┌──────────────────────────────────────┐
│ ◀  Book Session                      │
├──────────────────────────────────────┤
│                                      │
│ Coach Nguyen Van A                   │
│ 📍 65th Street PB                    │
│                                      │
│ ── Select Date ──                    │
│  April 2026                     ▸    │
│  ┌──┬──┬──┬──┬──┬──┬──┐            │
│  │Mo│Tu│We│Th│Fr│Sa│Su│            │
│  ├──┼──┼──┼──┼──┼──┼──┤            │
│  │  │ 8│ 9│⬛│11│12│13│            │
│  │  │  │🟢│10│  │🟢│🟢│           │
│  ├──┼──┼──┼──┼──┼──┼──┤            │
│  │14│15│16│17│18│19│20│            │
│  │  │  │🟢│🟢│  │🟢│🟢│           │
│  └──┴──┴──┴──┴──┴──┴──┘            │
│  🟢 = available  ⬛ = selected      │
│                                      │
│ ── Available Slots (April 10) ──     │
│  ┌──────────┐ ┌──────────┐          │
│  │ 07:00    │ │ 08:00    │          │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐          │
│  │ 16:00    │ │ 17:00    │          │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐                        │
│  │✅ 18:00  │  ← selected           │
│  └──────────┘                        │
│  Court: Sân 1 (auto-assigned)        │
│                                      │
│ ── Session Type ──                   │
│  ┌──────────────┐ ┌──────────────┐  │
│  │● 1-on-1      │ │○ Group       │  │
│  │  500,000 VND  │ │  250,000/p   │  │
│  └──────────────┘ └──────────────┘  │
│                                      │
│ ── Summary ──                        │
│  Coach fee         350,000 VND       │
│  Court fee         150,000 VND       │
│  Total             500,000 VND       │
│  Credits: 3 remaining               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │       [ Continue → Pay ]         │ │
│ └──────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

The Summary section and slot list remain hidden until a date and time slot are both selected. Tapping "Continue" navigates to `SessionPaymentScreen` (VietQR or credit use).

### 9.5 Player Credit Dashboard

```
┌──────────────────────────────────────┐
│ ◀  My Credits                        │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────────┐│
│  │ Coach Nguyen Van A               ││
│  │ Credits: 3 remaining             ││
│  │ Expires: June 15, 2026           ││
│  │ ┌──────────┐ ┌────────────────┐  ││
│  │ │ Buy More │ │ View Sessions │  ││
│  │ └──────────┘ └────────────────┘  ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │ Coach Tran Thi B                 ││
│  │ Credits: 1 remaining             ││
│  │ Expires: May 20, 2026            ││
│  │ ┌──────────┐ ┌────────────────┐  ││
│  │ │ Buy More │ │ View Sessions │  ││
│  │ └──────────┘ └────────────────┘  ││
│  └──────────────────────────────────┘│
│                                      │
│  ── History ──                       │
│  Apr 5  Used 1 credit (Coach A)     │
│  Apr 3  +1 credit refund (Coach A)  │
│  Mar 28 Bought 5-pack (Coach A)     │
│  Mar 15 Bought 1 session (Coach B)  │
│                                      │
└──────────────────────────────────────┘
```

### 9.6 My Sessions (Under Bookings Tab)

The existing "My Bookings" tab gets a segmented control to toggle between Court Bookings and Coach Sessions.

```
┌──────────────────────────────────────┐
│  My Bookings                         │
├──────────────────────────────────────┤
│  ┌───────────────┬──────────────────┐│
│  │ Court Bookings│  Coach Sessions  ││
│  └───────────────┴──────────────────┘│
│                    ▲ selected         │
│                                      │
│  ── Upcoming ──                      │
│  ┌──────────────────────────────────┐│
│  │ Apr 10 · 18:00–19:00            ││
│  │ Coach Nguyen Van A               ││
│  │ 65th Street PB · Sân 1          ││
│  │ 1-on-1 · Paid with credit       ││
│  │ ┌─────────┐ ┌──────────────┐    ││
│  │ │ Cancel  │ │ View Detail │    ││
│  │ └─────────┘ └──────────────┘    ││
│  └──────────────────────────────────┘│
│                                      │
│  ── Past ──                          │
│  ┌──────────────────────────────────┐│
│  │ Apr 5 · 10:00–11:00             ││
│  │ Coach Nguyen Van A               ││
│  │ Sunrise PB · Sân 2              ││
│  │ ⭐ Rate this session             ││
│  └──────────────────────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

---

## 10. UI/UX Design — Coach (Mobile)

Coaches use the same Expo app but see a different navigation after signing in with a coach account.

### 10.1 Coach Navigation

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              [Current Screen Content]            │
│                                                  │
├──────────┬───────────┬───────────┬───────────────┤
│  Today   │ Schedule  │ Players  │    Profile     │
│   📅    │   🗓     │   👥    │     ⚙        │
└──────────┴───────────┴───────────┴───────────────┘
```

### 10.2 Coach — Today Screen (Home)

```
┌──────────────────────────────────────┐
│  Good morning, Coach Nguyen! 👋      │
├──────────────────────────────────────┤
│                                      │
│  Today — April 6, 2026              │
│                                      │
│  ── Quick Stats ──                   │
│  ┌────────┐ ┌────────┐ ┌─────────┐  │
│  │ 3      │ │ 28     │ │ 4.8 ⭐  │  │
│  │Sessions│ │ This   │ │ Rating  │  │
│  │ today  │ │ month  │ │         │  │
│  └────────┘ └────────┘ └─────────┘  │
│                                      │
│  ── Today's Sessions ──              │
│                                      │
│  🔵 08:00 – 09:00                   │
│  Player: Mai Nguyen                  │
│  65th Street PB · Sân 1             │
│  1-on-1 · Credit                    │
│  [Start Session]                     │
│                                      │
│  ⚪ 10:00 – 11:00                   │
│  Group (3 players)                   │
│  Sunrise PB · Sân 2                 │
│  Mai, Hung, Linh                     │
│  [View Detail]                       │
│                                      │
│  ⚪ 16:00 – 17:00                   │
│  Player: Tran Hung                   │
│  65th Street PB · Sân 3             │
│  1-on-1 · VietQR (pending payment)  │
│  [View Detail]                       │
│                                      │
│  ── Upcoming ──                      │
│  ┌──────────────────────────────────┐│
│  │ Apr 8 · 14:00–15:00             ││
│  │ Player: Le Linh                  ││
│  │ 65th Street PB · Sân 2          ││
│  │ 1-on-1 · Auto-confirmed         ││
│  │ [View Detail]                    ││
│  └──────────────────────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

### 10.3 Coach — Schedule Screen

```
┌──────────────────────────────────────┐
│  Schedule                            │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────┬───────────────┐    │
│  │  Week View   │  Month View   │    │
│  └──────────────┴───────────────┘    │
│                                      │
│  April 7 – 13, 2026                 │
│                                      │
│  Mon 7   ░░░░░░░░ No sessions       │
│  Tue 8   ██░░░░░░ 08:00, 14:00      │
│  Wed 9   ███░░░░░ 08:00, 10:00, 16:00│
│  Thu 10  ██░░░░░░ 18:00, 19:00      │
│  Fri 11  ░░░░░░░░ No sessions       │
│  Sat 12  ████░░░░ 07:00, 08:00,    │
│                     09:00, 10:00     │
│  Sun 13  ██░░░░░░ 08:00, 09:00      │
│                                      │
│  ── Manage Availability ──           │
│  [Edit Weekly Schedule]              │
│  [Block Specific Dates]              │
│  [Set Holiday Hours]                 │
│                                      │
├──────────────────────────────────────┤
│  My Courts                           │
│  ┌──────────────────────────────┐    │
│  │ 📍 65th Street Pickleball   │    │
│  │    Sân 1, Sân 2, Sân 3     │    │
│  │    Status: Active            │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 📍 Sunrise Pickleball Club  │    │
│  │    Sân 1, Sân 2             │    │
│  │    Status: Active            │    │
│  └──────────────────────────────┘    │
│  [+ Add Court Partnership]          │
│                                      │
└──────────────────────────────────────┘
```

### 10.4 Coach — Weekly Availability Editor

```
┌──────────────────────────────────────┐
│ ◀  Weekly Schedule                   │
├──────────────────────────────────────┤
│                                      │
│  Recurring weekly availability       │
│  (Players can only book during       │
│   these windows)                     │
│                                      │
│  MONDAY                              │
│  ⚪ Not available                    │
│                                      │
│  TUESDAY                             │
│  🟢 07:00 – 12:00                   │
│     📍 65th Street PB               │
│  🟢 14:00 – 17:00                   │
│     📍 Sunrise PB Club              │
│  [+ Add time block]                  │
│                                      │
│  WEDNESDAY                           │
│  🟢 07:00 – 12:00                   │
│     📍 65th Street PB               │
│  🟢 16:00 – 19:00                   │
│     📍 65th Street PB               │
│  [+ Add time block]                  │
│                                      │
│  THURSDAY                            │
│  🟢 17:00 – 20:00                   │
│     📍 Sunrise PB Club              │
│  [+ Add time block]                  │
│                                      │
│  ...                                 │
│                                      │
│  ┌──────────────────────────────────┐│
│  │        [ Save Schedule ]          ││
│  └──────────────────────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

### 10.5 Coach — Players Screen

```
┌──────────────────────────────────────┐
│  My Players                          │
├──────────────────────────────────────┤
│                                      │
│  🔍 Search players...               │
│                                      │
│  ── Active (12 players) ──           │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ Mai Nguyen                       ││
│  │ Credits: 3 remaining             ││
│  │ 8 sessions completed             ││
│  │ Last session: Apr 5              ││
│  │ [View History] [Message]         ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │ Tran Hung                        ││
│  │ Credits: 0 (pay per session)     ││
│  │ 3 sessions completed             ││
│  │ Last session: Mar 28             ││
│  │ [View History] [Message]         ││
│  └──────────────────────────────────┘│
│                                      │
│  ── Earnings Summary ──              │
│  ┌──────────────────────────────────┐│
│  │ This month:  14,500,000 VND      ││
│  │ Sessions:    28                   ││
│  │ Credits sold: 15                  ││
│  └──────────────────────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

### 10.6 Coach — Profile / Settings

```
┌──────────────────────────────────────┐
│  Profile & Settings                  │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────┐                    │
│  │  Coach Photo │  Nguyen Van A      │
│  │              │  ⭐ 4.8 (32)      │
│  └──────────────┘  IPTPA Level 2    │
│                                      │
│  ── Edit Profile ──                  │
│  [Bio & About]                       │
│  [Certifications]                    │
│  [Specialties]                       │
│  [Profile Photo]                     │
│                                      │
│  ── Pricing ──                       │
│  [Session Rates]                     │
│  [Credit Packs]                      │
│  [Group Pricing]                     │
│                                      │
│  ── Payment ──                       │
│  [Bank Account (VietQR)]             │
│  [Payment History]                   │
│                                      │
│  ── Policies ──                      │
│  [Cancellation Policy]              │
│  [Credit Expiry (90 days)]          │
│                                      │
│  ── Account ──                       │
│  [Notifications]                     │
│  [Sign Out]                          │
│                                      │
└──────────────────────────────────────┘
```

---

## 11. UI/UX Design — Court Owner (Web)

The court owner experience extends the existing admin panel at `/admin`. A new role (`court_owner`) is added, scoped to specific venues.

### 11.1 Court Owner Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  CourtMap Admin · 65th Street Pickleball                     🔔 │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ Dashboard│  Dashboard — April 6, 2026                          │
│ Bookings │                                                      │
│ Courts   │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │
│ Coaches  │  │ 12         │ │ 85%        │ │ 4,200,000 VND  │   │
│ Pricing  │  │ Bookings   │ │ Occupancy  │ │ Revenue Today  │   │
│ Schedule │  │ today      │ │ today      │ │                │   │
│ Reports  │  └────────────┘ └────────────┘ └────────────────┘   │
│ Settings │                                                      │
│          │  Booking Sources                                     │
│          │  ┌─────────────────────────────────────┐             │
│          │  │ Direct (player)     █████████ 65%   │             │
│          │  │ Coach-mediated      █████     35%   │             │
│          │  └─────────────────────────────────────┘             │
│          │                                                      │
│          │  Today's Timeline — Sân 1                           │
│          │  07 08 09 10 11 12 13 14 15 16 17 18 19 20 21      │
│          │  ██ ██ ██ ░░ ░░ ░░ ░░ ██ ██ ██ ██ ██ ██ ░░ ░░      │
│          │  ▲coach   ▲open       ▲direct   ▲coach               │
│          │                                                      │
│          │  Today's Timeline — Sân 2                           │
│          │  07 08 09 10 11 12 13 14 15 16 17 18 19 20 21      │
│          │  ░░ ██ ██ ██ ░░ ░░ ░░ ░░ ██ ██ ░░ ██ ██ ██ ░░      │
│          │                                                      │
│          │  Today's Timeline — Sân 3                           │
│          │  07 08 09 10 11 12 13 14 15 16 17 18 19 20 21      │
│          │  ██ ██ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ██ ██ ██ ░░ ░░ ░░      │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### 11.2 Coaches Management Page

```
┌─────────────────────────────────────────────────────────────────┐
│  CourtMap Admin · 65th Street Pickleball                        │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ Dashboard│  Coaches at this Venue                               │
│ Bookings │                                                      │
│ Coaches ◀│  ┌───────────────────────────────────────────────┐   │
│ Courts   │  │ Coach           Sessions  Revenue   Status    │   │
│ Pricing  │  ├───────────────────────────────────────────────┤   │
│ Schedule │  │ Nguyen Van A    28/month  3.2M VND  ✅ Active │   │
│ Reports  │  │ Tran Thi B      15/month  2.1M VND  ✅ Active │   │
│ Settings │  │ Le Van C         8/month  960K VND  ⏸ Paused │   │
│          │  └───────────────────────────────────────────────┘   │
│          │                                                      │
│          │  Coach Revenue Contribution                          │
│          │  This month: 6,260,000 VND (35% of total)           │
│          │                                                      │
│          │  [+ Invite Coach]                                    │
│          │                                                      │
│          │  Invite Coach Flow:                                  │
│          │  ┌─────────────────────────────────────────────┐     │
│          │  │ Enter coach phone number                    │     │
│          │  │ ┌─────────────────────────────────────┐     │     │
│          │  │ │ 0912 345 678                        │     │     │
│          │  │ └─────────────────────────────────────┘     │     │
│          │  │ OR paste coach profile link                 │     │
│          │  │ ┌─────────────────────────────────────┐     │     │
│          │  │ │ courtmap.vn/coach/abc123             │     │     │
│          │  │ └─────────────────────────────────────┘     │     │
│          │  │                                             │     │
│          │  │ [Send Invite]  [Cancel]                     │     │
│          │  └─────────────────────────────────────────────┘     │
│          │                                                      │
│          │  Coach receives push notification:                   │
│          │  "[Venue Name] invited you to coach at their venue.  │
│          │   Accept?" → Accept / Decline buttons in coach app   │
│          │                                                      │
│          │  Pending Invites                                     │
│          │  ┌──────────────────────────────────────────────┐    │
│          │  │ Coach Pham D  ·  Invited Apr 4  ·  [Cancel] │    │
│          │  └──────────────────────────────────────────────┘    │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### 11.3 Revenue Reports

```
┌─────────────────────────────────────────────────────────────────┐
│  CourtMap Admin · 65th Street Pickleball                        │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ Dashboard│  Revenue Report — April 2026                        │
│ Bookings │                                                      │
│ Courts   │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │
│ Coaches  │  │Total       │ │ Direct     │ │ Via Coaches    │   │
│ Pricing  │  │18,500,000  │ │12,025,000  │ │ 6,475,000     │   │
│ Schedule │  │VND         │ │VND (65%)   │ │ VND (35%)     │   │
│ Reports ◀│  └────────────┘ └────────────┘ └────────────────┘   │
│ Settings │                                                      │
│          │  Daily Revenue Chart                                 │
│          │  ┌─────────────────────────────────────────┐         │
│          │  │     ▄                                   │         │
│          │  │  ▄  █ ▄     ▄ ▄                        │         │
│          │  │  █  █ █  ▄  █ █  ▄                     │         │
│          │  │  █  █ █  █  █ █  █                     │         │
│          │  │ ─┼──┼─┼──┼──┼─┼──┼─── →               │         │
│          │  │  1  2 3  4  5 6  7                     │         │
│          │  └─────────────────────────────────────────┘         │
│          │  ■ Direct  ■ Coach                                   │
│          │                                                      │
│          │  Court Utilization                                   │
│          │  ┌──────────────────────────────────────┐            │
│          │  │ Sân 1  ████████████████████ 92%      │            │
│          │  │ Sân 2  ██████████████████   85%      │            │
│          │  │ Sân 3  ██████████████       68%      │            │
│          │  └──────────────────────────────────────┘            │
│          │                                                      │
│          │  [Export CSV]  [Export PDF]                           │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## 12. New Data Models

### Prisma Schema Additions

```prisma
model Coach {
  id              String              @id @default(cuid())
  name            String
  phone           String              @unique
  email           String?             @unique
  passwordHash    String
  photo           String?
  bio             String?
  certifications  String[]            // ["IPTPA Level 2", "PPR Certified"]
  specialties     String[]            // ["beginner", "advanced", "drills", "match_play", "kids"]
  ratingOverall       Float?
  ratingOnTime        Float?
  ratingFriendly      Float?
  ratingProfessional  Float?
  ratingRecommend     Float?
  reviewCount     Int                 @default(0)
  isActive        Boolean             @default(true)

  // Subscription
  subscriptionPlan     String         @default("trial")  // "trial" | "standard" | "pro"
  subscriptionExpires  DateTime?
  trialBookingsUsed    Int            @default(0)

  // Pricing (VND)
  hourlyRate1on1  Int                 // e.g., 500000
  hourlyRateGroup Int?                // e.g., 250000 per person
  maxGroupSize    Int                 @default(4)

  // Cancellation policy
  cancellationHours Int              @default(24)   // minimum hours before session
  creditExpiryDays  Int              @default(90)

  // Payment
  bankName        String?
  bankAccountName String?
  bankAccountNumber String?
  bankBin         String?             // for VietQR

  // Abuse prevention — incremented each time coach flags ANY session
  paymentFlagCount    Int            @default(0)   // lifetime total across ALL sessions; gate at 3

  courtLinks      CoachCourtLink[]
  availability    CoachAvailability[]
  sessions        CoachSession[]
  creditPacks     CreditPack[]
  credits         Credit[]
  reviews         CoachReview[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

model CoachCourtLink {
  id        String  @id @default(cuid())
  coachId   String
  coach     Coach   @relation(fields: [coachId], references: [id], onDelete: Cascade)
  venueId   String
  venue     Venue   @relation(fields: [venueId], references: [id], onDelete: Cascade)
  courtIds  String[]    // specific courts at this venue the coach uses
  isActive  Boolean @default(true)

  @@unique([coachId, venueId])
  @@index([coachId])
  @@index([venueId])
}

model CoachAvailability {
  id          String  @id @default(cuid())
  coachId     String
  coach       Coach   @relation(fields: [coachId], references: [id], onDelete: Cascade)

  // Recurring: dayOfWeek (0=Sun, 6=Sat)
  dayOfWeek   Int?
  // Override: specific date (takes precedence over recurring)
  date        String?

  startTime   String  // "07:00"
  endTime     String  // "12:00"
  venueId     String  // which venue during this block
  isBlocked   Boolean @default(false)  // true = explicitly unavailable

  @@index([coachId])
  @@index([coachId, dayOfWeek])
  @@index([coachId, date])
}

model CoachSession {
  id              String          @id @default(cuid())
  coachId         String
  coach           Coach           @relation(fields: [coachId], references: [id])
  venueId         String
  venueName       String
  courtName       String?
  date            String          // "2026-04-10"
  startTime       String          // "18:00"
  endTime         String          // "19:00"
  sessionType     String          // "1on1" | "group"
  maxPlayers      Int             @default(1)

  // Pricing
  coachFee        Int             // coach portion (VND)
  courtFee        Int             // court portion (VND)
  totalPerPlayer  Int             // coachFee + courtFee (1-on-1) or split (group)

  // Payment
  paymentMethod   String?         // "credit" | "vietqr"
  paymentStatus   String          @default("pending")
  // pending → payment_submitted → confirmed → completed → canceled

  // Payment flag (per-session)
  paymentFlaggedAt    DateTime?   // when coach flagged payment not received on THIS session

  // Court slot reservation
  slotIds         String[]        // linked TimeSlot IDs (for court owner visibility)

  participants    SessionParticipant[]

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([coachId])
  @@index([coachId, date])
  @@index([venueId])
}

model SessionParticipant {
  id            String        @id @default(cuid())
  sessionId     String
  session       CoachSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId        String
  userName      String
  userPhone     String
  amountDue     Int           // their share of total
  paymentMethod String?       // "credit" | "vietqr"
  paymentStatus String        @default("pending")
  paymentProofUrl String?
  paidAt        DateTime?
  creditId      String?       // if paid with credit, link to Credit record

  @@unique([sessionId, userId])
  @@index([sessionId])
  @@index([userId])
}

model CreditPack {
  id              String    @id @default(cuid())
  coachId         String
  coach           Coach     @relation(fields: [coachId], references: [id], onDelete: Cascade)
  name            String    // "5-Pack", "10-Pack"
  creditCount     Int       // 5, 10
  price           Int       // total price in VND
  discountPercent Int?      // 10, 20
  isActive        Boolean   @default(true)

  @@index([coachId])
}

model Credit {
  id              String    @id @default(cuid())
  coachId         String
  coach           Coach     @relation(fields: [coachId], references: [id])
  userId          String
  userName        String
  userPhone       String

  // Pack info
  creditPackId    String?   // null if single purchase
  totalCredits    Int       // credits purchased
  remainingCredits Int      // current balance
  pricePerCredit  Int       // VND per credit

  // Payment for the pack
  totalPaid       Int
  paymentProofUrl String?
  paymentStatus   String    @default("pending")  // pending | confirmed

  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([coachId, userId])
  @@index([userId])
}

model CoachReview {
  id              String    @id @default(cuid())
  coachId         String
  coach           Coach     @relation(fields: [coachId], references: [id], onDelete: Cascade)
  sessionId       String?
  userId          String
  userName        String
  ratingOnTime    Int       // 1-5
  ratingFriendly  Int       // 1-5
  ratingProfessional Int    // 1-5
  ratingRecommend Int       // 1-5
  ratingOverall   Float     // auto-calculated: avg of all 4 dimensions
  comment         String?
  createdAt       DateTime  @default(now())

  @@index([coachId])
  @@index([userId])
}
```

### Coach Venue Invite Model

```prisma
model CoachVenueInvite {
  id          String    @id @default(cuid())
  coachId     String
  venueId     String
  invitedBy   String    // admin userId
  status      String    @default("pending")  // "pending" | "accepted" | "declined"
  createdAt   DateTime  @default(now())
  respondedAt DateTime?

  @@unique([coachId, venueId])
  @@index([coachId])
  @@index([venueId])
}
```

### Updated Venue Model (Addition)

```prisma
model Venue {
  // ... existing fields ...
  coachLinks  CoachCourtLink[]   // NEW: coaches operating at this venue
}
```

### Entity Relationship Diagram

```
┌───────────┐       ┌──────────────────┐       ┌───────────┐
│   Player   │──────▶│ SessionParticipant│◀──────│CoachSession│
│  (userId)  │       └──────────────────┘       └─────┬─────┘
│            │                                        │
│            │──────▶┌──────────────────┐              │
│            │       │     Credit       │              │
│            │       │  (coach-scoped)  │              │
│            │       └────────┬─────────┘              │
│            │                │                        │
│            │       ┌────────▼─────────┐       ┌──────▼──────┐
│            │       │    CreditPack    │       │    Coach     │
│            │       └────────┬─────────┘       └──────┬──────┘
│            │                │                        │
│            │       ┌────────▼─────────┐       ┌──────▼──────────┐
│            │       │   CoachReview    │       │CoachAvailability │
│            │       │ (4-dim ratings)  │       └──────┬──────────┘
│            │       └──────────────────┘              │
│            │                                  ┌──────▼──────────┐
│            │──────▶┌──────────────────┐       │ CoachCourtLink   │
│            │       │    Booking       │       └──────┬──────────┘
│  (existing)│       │   (court-only)   │              │
└───────────┘       └────────┬─────────┘       ┌──────▼──────────┐
                             │                 │CoachVenueInvite  │
                      ┌──────▼──────┐          └──────┬──────────┘
                      │    Venue     │◀───────────────┘
                      │ (1,976)      │◀─────────┌─────────────┐
                      └─────────────┘          │    Court     │
                                               │  (10,581)    │
                                               └─────────────┘
```

---

## 13. New API Endpoints

### Coach APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/coaches/register` | Register new coach account | Public |
| `POST` | `/api/coaches/login` | Coach login → JWT token | Public |
| `GET` | `/api/coaches` | List/search coaches (player-facing) | Public |
| `GET` | `/api/coaches/[id]` | Coach profile + availability | Public |
| `PATCH` | `/api/coaches/[id]` | Update coach profile | Coach |
| `GET` | `/api/coaches/[id]/availability` | Get availability for a date range | Public |
| `PUT` | `/api/coaches/[id]/availability` | Set weekly/override availability | Coach |
| `GET` | `/api/coaches/[id]/reviews` | List reviews | Public |
| `POST` | `/api/coaches/[id]/reviews` | Submit review after session | Player |

### Coach Subscription APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/coaches/[id]/subscription` | Initiate subscription payment (VietQR) | Coach |
| `PATCH` | `/api/coaches/[id]/subscription` | Confirm subscription payment | Coach |
| `GET` | `/api/coaches/[id]/subscription` | Get current plan status | Coach |

### Coach Court Link APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/coaches/[id]/courts` | List coach's court partnerships | Public |
| `POST` | `/api/coaches/[id]/courts` | Add court partnership | Coach |
| `DELETE` | `/api/coaches/[id]/courts/[venueId]` | Remove court partnership | Coach |

### Session APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/sessions` | Book a coach session | Player |
| `GET` | `/api/sessions` | List sessions (filtered by userId or coachId) | Player/Coach |
| `GET` | `/api/sessions/[id]` | Session detail | Player/Coach |
| `PATCH` | `/api/sessions/[id]` | Update session status (complete, cancel). Bookings auto-confirmed on creation. | Coach |
| `PATCH` | `/api/sessions/[id]/payment` | Submit payment proof | Player |
| `POST` | `/api/sessions/[id]/flag-payment` | Coach flags payment not received. Sets `CoachSession.paymentFlaggedAt`, increments `Coach.paymentFlagCount` (lifetime, max 3). 2hr window from player's payment submission. | Coach |
| `POST` | `/api/sessions/[id]/join` | Join a group session | Player |
| `DELETE` | `/api/sessions/[id]/leave` | Leave a group session | Player |

### Credit APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/credits` | List player's credit balances (all coaches) | Player |
| `POST` | `/api/credits/purchase` | Buy a credit pack (initiates VietQR) | Player |
| `GET` | `/api/credits/[id]` | Credit detail + transaction history | Player |
| `PATCH` | `/api/credits/[id]/confirm` | Confirm credit pack payment | Coach |

### Coach Invite APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/admin/venues/[id]/coaches/invite` | Court owner sends invite to coach | Owner |
| `GET` | `/api/coaches/[id]/invites` | List pending invites for a coach | Coach |
| `POST` | `/api/coaches/[id]/invites/[inviteId]/accept` | Coach accepts venue invite | Coach |
| `POST` | `/api/coaches/[id]/invites/[inviteId]/decline` | Coach declines venue invite | Coach |

### Court Owner APIs (Admin Extension)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/admin/venues/[id]/coaches` | List coaches at venue | Owner |
| `GET` | `/api/admin/venues/[id]/sessions` | All sessions at venue (coach-mediated) | Owner |
| `GET` | `/api/admin/venues/[id]/reports` | Revenue reports (direct vs. coach) | Owner |

---

## 14. Screen Inventory

### Player (Mobile — Expo)

| Screen | Type | Description |
|--------|------|-------------|
| `CoachListScreen` | Tab | Coach discovery with search/filter |
| `CoachProfileScreen` | Stack | Full coach profile + book CTA |
| `SessionBookingScreen` | Stack | Single screen: calendar + time slots + session type + summary. No intermediate steps. |
| `SessionPaymentScreen` | Stack | VietQR payment or credit use |
| `MyCreditsScreen` | Stack | Credit balances + history |
| `BuyCreditPackScreen` | Stack | Select pack → VietQR payment |
| `SessionDetailScreen` | Stack | View session detail + cancel |
| `RateSessionScreen` | Stack | Post-session rating + review |
| **Modified:** `BookingsScreen` | Tab | Add segment: Court Bookings / Coach Sessions |

### Coach (Mobile — Expo)

| Screen | Type | Description |
|--------|------|-------------|
| `CoachTodayScreen` | Tab | Today's sessions + quick stats |
| `CoachScheduleScreen` | Tab | Week/month view + availability editor |
| `CoachPlayersScreen` | Tab | Player list + earnings |
| `CoachProfileSettingsScreen` | Tab | Edit profile, pricing, bank, policies |
| `AvailabilityEditorScreen` | Stack | Weekly recurring + date overrides |
| `CoachSessionDetailScreen` | Stack | Session detail + mark complete |
| `CourtPartnershipScreen` | Stack | Browse + add venue partnerships |
| `CoachEarningsScreen` | Stack | Monthly earnings breakdown |

### Court Owner (Web — Admin Extension)

| Page | Route | Description |
|------|-------|-------------|
| `OwnerDashboard` | `/admin/dashboard` | Enhanced with coach metrics |
| `CoachesPage` | `/admin/coaches` | Coach list + invite |
| `CoachDetailPage` | `/admin/coaches/[id]` | Coach detail + sessions at venue |
| `ReportsPage` | `/admin/reports` | Revenue reports with direct vs. coach split |
| **Modified:** `BookingsPage` | `/admin/bookings` | Add coach session filter |

---

## 15. Implementation Phases

### Phase 1: Foundation (Weeks 1–3)

- [ ] **Data models**: Add Coach, CoachCourtLink, CoachAvailability, CoachSession, SessionParticipant to Prisma schema
- [ ] **Coach auth**: Registration, login, JWT-based authentication
- [ ] **Coach profile API**: CRUD for coach profiles
- [ ] **Coach availability API**: Weekly schedule + date overrides
- [ ] **Court partnership API**: Link coaches to venues/courts
- [ ] **Coach subscription model**: Trial logic, plan status, expiry check middleware
- [ ] **Subscription renewal**: VietQR generation + confirmation flow
- [ ] **CoachVenueInvite model**
- [ ] **Invite send API** + push notification to coach
- [ ] **Accept/decline API** + creates CoachCourtLink on accept
- [ ] **Shared components**: Build all 12 components from Section 2b before any Phase 2 screen work begins (CoachCard, SessionCard, CreditBadge, RatingBar, StarRating, VietQRBlock, TimeSlotGrid, DatePicker, SectionHeader, EmptyState, BottomSheet, StatusChip)
- [ ] **Platform safety audit**: Audit existing court booking components (DatePicker, TimeSlotGrid) — confirm they use no web primitives before reuse in coach flow
- [ ] **Barrel export**: Create `components/index.ts` so all shared components are imported from one place

### Phase 2: Player Booking (Weeks 4–6)

- [ ] **Coach discovery UI** (mobile): CoachListScreen with search/filter
- [ ] **Coach profile UI** (mobile): CoachProfileScreen with availability calendar
- [ ] **Session booking flow** (mobile): Date → time → confirm → VietQR payment
- [ ] **Session API**: Create, list, cancel sessions
- [ ] **Group sessions**: Join/leave group sessions, cost splitting

### Phase 3: Credit System (Weeks 7–8)

- [ ] **Credit models**: CreditPack, Credit
- [ ] **Credit purchase flow**: Select pack → VietQR → coach confirms
- [ ] **Credit usage**: Use credit during session booking
- [ ] **Credit refund on cancel**: +1 credit same coach
- [ ] **Credit dashboard UI** (mobile): MyCreditsScreen

### Phase 4: Coach Mobile App (Weeks 9–11)

- [ ] **Coach navigation**: Role-based tab layout in Expo
- [ ] **Today screen**: Daily sessions overview
- [ ] **Schedule screen**: Week/month view + availability editor
- [ ] **Players screen**: Player list, credits, earnings
- [ ] **Session management**: Auto-confirmed bookings, cancel, mark complete
- [ ] **Payment flag**: 2hr window logic, max 3 lifetime flags, revert booking to pending, notify player
- [ ] **Profile settings**: Bio, pricing, bank account, policies

### Phase 5: Court Owner Web (Weeks 12–13)

- [ ] **Admin role extension**: Court owner role with venue scope
- [ ] **Dashboard enhancements**: Coach metrics, booking source breakdown
- [ ] **Coaches page**: List coaches at venue, invite flow
- [ ] **Revenue reports**: Direct vs. coach-mediated with charts
- [ ] **Invite coach UI**: Phone/link input sheet, pending invites list with cancel option

### Phase 6: Reviews & Polish (Week 14)

- [ ] **Review system**: Post-session rating + review
- [ ] **4-dimension rating**: Update review submission UI, update rating aggregation logic on Coach model, update coach profile display
- [ ] **Coach rating aggregation**: Average + count per dimension
- [ ] **Notifications**: Session reminders, payment confirmations, booking requests
- [ ] **Edge cases**: Expired credits, double-booking prevention, concurrent group joins
- [ ] **Testing & QA**: End-to-end flows for all three roles

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Credit** | A pre-paid session unit, scoped to a specific coach. 1 credit = 1 hour session. |
| **Credit Pack** | A bundle of credits purchased at a discount (e.g., 5-pack, 10-pack). |
| **Coach Fee** | The portion of session cost that goes to the coach. |
| **Court Fee** | The portion of session cost that covers court rental. Paid by coach to court owner. |
| **Session** | A coaching appointment: 1 coach + 1–4 players at a specific court and time. |
| **Court Partnership** | A link between a coach and a venue, allowing the coach to book sessions there. |
| **VietQR** | Vietnamese QR payment standard used for bank transfers. |
| **AloBo** | External platform (`datlich.alobo.vn`) from which venue data is scraped. |

## Appendix B: Open Questions

1. **Coach verification**: Should there be an admin approval step before a coach profile goes live?
2. ~~**Commission model**~~: Resolved — flat monthly subscription (trial / standard / pro). No per-session commission.
3. **Push notifications**: Which notification service for mobile (Expo Push, FCM, APNs)?
4. **Chat**: Should players and coaches be able to message each other in-app?
5. **Recurring sessions**: Should players be able to book weekly recurring sessions with a coach?
6. **Multi-language**: Vietnamese and English support for coach profiles and UI?

---

## Appendix C: Screen Count Summary

### Totals

| Category | Count |
|----------|-------|
| **Existing** (pre-feature, unchanged) | 9 |
| **New** | 19 |
| **Modified** (existing screens gaining new functionality) | 3 |
| **Total after implementation** | 31 |

### Existing Screens (unchanged — 9)

| # | Screen | Platform | Notes |
|---|--------|----------|-------|
| 1 | `SearchScreen` | Mobile | Court search with filters |
| 2 | `ResultsScreen` | Mobile | Venue list with sort/pagination |
| 3 | `MapScreen` | Mobile | Map view (search + explore modes) |
| 4 | `SavedScreen` | Mobile | Saved venues |
| 5 | `ProfileScreen` | Mobile | User profile + settings |
| 6 | `VenueDetail` | Mobile | Overlay/modal with availability, pricing, info tabs |
| 7 | `AdminDashboard` | Web | Admin overview (pre-coach metrics) |
| 8 | `AdminCourtsPage` | Web | Court management |
| 9 | `AdminPaymentsPage` | Web | Payment management |

### New Screens (19)

| # | Screen | Platform | Role | Phase |
|---|--------|----------|------|-------|
| 1 | `CoachListScreen` | Mobile | Player | 2 |
| 2 | `CoachProfileScreen` | Mobile | Player | 2 |
| 3 | `SessionBookingScreen` | Mobile | Player | 2 |
| 4 | `SessionPaymentScreen` | Mobile | Player | 2 |
| 5 | `SessionDetailScreen` | Mobile | Player | 2 |
| 6 | `MyCreditsScreen` | Mobile | Player | 3 |
| 7 | `BuyCreditPackScreen` | Mobile | Player | 3 |
| 8 | `RateSessionScreen` | Mobile | Player | 6 |
| 9 | `CoachTodayScreen` | Mobile | Coach | 4 |
| 10 | `CoachScheduleScreen` | Mobile | Coach | 4 |
| 11 | `CoachPlayersScreen` | Mobile | Coach | 4 |
| 12 | `CoachProfileSettingsScreen` | Mobile | Coach | 4 |
| 13 | `AvailabilityEditorScreen` | Mobile | Coach | 4 |
| 14 | `CoachSessionDetailScreen` | Mobile | Coach | 4 |
| 15 | `CourtPartnershipScreen` | Mobile | Coach | 4 |
| 16 | `CoachEarningsScreen` | Mobile | Coach | 4 |
| 17 | `CoachesPage` | Web | Court Owner | 5 |
| 18 | `CoachDetailPage` | Web | Court Owner | 5 |
| 19 | `ReportsPage` | Web | Court Owner | 5 |

### Modified Screens (3)

| # | Screen | Platform | Modification |
|---|--------|----------|-------------|
| 1 | `BookingsScreen` | Mobile | Add segmented control: Court Bookings / Coach Sessions |
| 2 | `OwnerDashboard` | Web | Add coach metrics, booking source breakdown, timeline heatmap |
| 3 | `AdminBookingsPage` | Web | Add coach session filter alongside existing court bookings |


Add a new section "16. Trust and Safety — Phase 1" 
to COURTMAP_PRODUCT_SPEC.md before the Appendix.
Update changelog to v1.2, April 6, 2026.

---

SECTION 16 — Trust and Safety (Phase 1)

Simple rules only. More can be added later.

---

16.1 OTP phone verification

Required before:
- A player can make their first coach session booking
- A coach profile becomes visible in search results

Implementation:
- Reuse the same OTP flow for both player and coach 
  registration (SMS to phone number, 6-digit code, 
  expires in 5 minutes)
- Add to UserProfile:
    phoneVerified       Boolean   @default(false)
    phoneVerifiedAt     DateTime?
- Add to Coach model:
    phoneVerified       Boolean   @default(false)
    phoneVerifiedAt     DateTime?
- Block POST /api/sessions if 
  UserProfile.phoneVerified = false
- Block coach profile from appearing in 
  GET /api/coaches search results if 
  Coach.phoneVerified = false
- Unverified coach sees banner in app:
  "Verify your phone number to make your 
   profile visible to players."

---

16.2 Booking limit — max 3 coaching hours per day 
per player

A player cannot book more than 3 hours of coaching 
in a single calendar day across all coaches.

Implementation:
- On POST /api/sessions, check total duration of 
  confirmed + pending coach sessions for this 
  userId on the requested date
- If total would exceed 3 hours, reject with 400:
  "You can only book up to 3 hours of coaching 
   per day. You have [N] hour(s) booked on 
   this date."
- Count sessions with status: pending, 
  payment_submitted, or paid
- Cancelled sessions do not count toward the limit

---

16.3 Rating eligibility — 3 completed sessions 
required

A player cannot leave a visible public rating for 
a coach until they have completed 3 sessions 
with that coach.

Rules:
- "Completed" = session paymentStatus is paid 
  AND session is marked complete
- Before 3 completed sessions:
  - Player CAN submit a rating after each session 
    (both player and coach can see it privately)
  - Rating is NOT visible to other players yet
  - RateSessionScreen shows note:
    "Your rating is saved. It will be visible to 
     other players after you complete 3 sessions 
     with this coach. [N] of 3 completed."
- After 3rd completed session:
  - All previously submitted ratings for this 
    coach by this player become public immediately
  - All future ratings are public immediately
- Each session can only be rated once, 
  no editing after submission

Add to CoachReview model:
  isPublic     Boolean   @default(false)
  // false until player has 3 completed sessions 
  // with this coach

Add to SessionParticipant model:
  sessionNumberWithCoach  Int
  // auto-calculated at session creation:
  // count of prior completed sessions between 
  // this userId and coachId + 1

Logic on session completion:
  When a session is marked complete for a player:
  1. Increment sessionNumberWithCoach
  2. If this player now has >= 3 completed sessions 
     with this coach, set isPublic = true on ALL 
     their CoachReview records for this coach

GET /api/coaches/[id]/reviews:
  Return only reviews where isPublic = true
  (private reviews are never sent to other players)

GET /api/coaches/[id] (coach's own profile view):
  Return all reviews including isPublic = false, 
  clearly labelled as "pending — visible after 
  3 sessions"

---

Add to Phase 1 checklist:
  - OTP verification for player and coach 
    registration
  - Gate coach search visibility on 
    Coach.phoneVerified
  - Gate player booking on 
    UserProfile.phoneVerified

Add to Phase 2 checklist:
  - Booking limit: max 3 coaching hours per 
    calendar day per player

Add to Phase 6 checklist:
  - Rating visibility: isPublic logic, 
    3-session threshold, bulk publish on 
    3rd completion
  - Coach private review view in 
    CoachSessionDetailScreen

---

Changelog v1.2 — April 6, 2026:
- Added Section 16: Trust and Safety (Phase 1)
- OTP phone verification required for players 
  to book and for coaches to appear in search
- Player booking capped at 3 coaching hours 
  per day
- Ratings require 3 completed sessions before 
  becoming public; player and coach see them 
  privately in the meantime