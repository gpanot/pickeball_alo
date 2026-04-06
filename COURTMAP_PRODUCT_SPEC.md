# CourtMap — Product Specification

**Version:** 1.0  
**Date:** April 6, 2026  
**Product:** CourtMap (Pickleball Vietnam)  
**Status:** Current State + Coach+Court Booking System (New Feature)

---

## Table of Contents

1. [Current App Overview](#1-current-app-overview)
2. [Tech Stack](#2-tech-stack)
3. [Current Data Model](#3-current-data-model)
4. [Current Booking Flow](#4-current-booking-flow)
5. [New Feature: Coach + Court Booking System](#5-new-feature-coach--court-booking-system)
6. [User Roles](#6-user-roles)
7. [Credit System](#7-credit-system)
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

1. **Coach pre-selects courts** — Coaches define which venues/courts they operate at. Players pick a coach and a time; the court is part of the package.
2. **Credit system** — Players can buy credit packs with specific coaches or pay per session. Cancellations refund a credit (same coach only).
3. **Coach handles court payment** — The player pays the full amount (coach fee + court fee) to the coach via VietQR. The coach is responsible for paying the court owner separately.
4. **Group sessions** — Coaches can offer both 1-on-1 and group sessions (2–4 players sharing the cost).
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
| Rate & review | Leave rating + text review after a completed session |
| Book courts (existing) | Continue using current court-only booking flow |

### 6.2 Coach (Mobile — Expo App)

A new user type with their own mobile experience (same Expo app, role-based navigation).

| Capability | Description |
|------------|-------------|
| Profile setup | Name, photo, bio, certifications, specialties, pricing tiers |
| Court partnerships | Select which venues/courts they coach at (from the 1,976 venue catalog) |
| Availability | Set weekly recurring schedule + date-specific overrides |
| Session management | View upcoming/past sessions, confirm/cancel, mark complete |
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

For **group sessions**, the court fee is split among participants:

```
┌─────────────────────────────────────┐
│      Group Session (3 players)      │
├─────────────────────────────────────┤
│ Coach fee (per person)  200,000     │
│ Court fee (split 3 ways) 50,000    │
│ ─────────────────────────────       │
│ Your total             250,000 VND  │
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
│   ⭐ 4.8 (32 reviews)               │
│   IPTPA Level 2 · PPR Certified     │
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

### 9.4 Session Booking Flow (Player)

```
Step 1: Select Date                Step 2: Select Time
┌────────────────────┐            ┌────────────────────┐
│ ◀  Book Session    │            │ ◀  Select Time     │
├────────────────────┤            ├────────────────────┤
│                    │            │                    │
│ Coach Nguyen Van A │            │ April 10, 2026     │
│ 📍 65th Street PB  │            │ 📍 65th Street PB  │
│                    │            │                    │
│  April 2026        │            │  Available Slots:  │
│  ┌──┬──┬──┬──┐    │            │                    │
│  │ 9│10│11│12│    │            │  🟢 07:00 – 08:00 │
│  │  │🟢│🟢│🟢│    │            │  🟢 08:00 – 09:00 │
│  └──┴──┴──┴──┘    │            │  ⚫ 09:00 – 10:00 │
│                    │            │  🟢 16:00 – 17:00 │
│ 🟢 = available    │            │  🟢 17:00 – 18:00 │
│                    │            │  ✅ 18:00 – 19:00 │
│  Session type:     │            │                    │
│  ● 1-on-1 (500k)  │            │ Court: Sân 1       │
│  ○ Group  (250k/p)│            │ (auto-assigned)    │
│                    │            │                    │
│  [Continue →]      │            │  [Continue →]      │
└────────────────────┘            └────────────────────┘

Step 3: Confirm & Pay
┌────────────────────────────┐
│ ◀  Confirm Booking         │
├────────────────────────────┤
│                            │
│ Coach Nguyen Van A         │
│ April 10, 2026             │
│ 18:00 – 19:00             │
│ 65th Street PB – Sân 1    │
│ Session: 1-on-1           │
│                            │
│ ┌────────────────────────┐ │
│ │ Coach fee    350,000   │ │
│ │ Court fee    150,000   │ │
│ │ ──────────────────     │ │
│ │ Total        500,000   │ │
│ └────────────────────────┘ │
│                            │
│ Your credits: 3 remaining  │
│                            │
│ ┌────────────────────────┐ │
│ │  [Use 1 Credit]        │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │  [Pay via VietQR]      │ │
│ └────────────────────────┘ │
│                            │
└────────────────────────────┘
```

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
│  ── Pending Requests ──              │
│  ┌──────────────────────────────────┐│
│  │ New booking request              ││
│  │ Player: Le Linh                  ││
│  │ Apr 8, 14:00 · 1-on-1           ││
│  │ [Accept]  [Decline]              ││
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
  rating          Float?
  reviewCount     Int                 @default(0)
  isActive        Boolean             @default(true)

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
  id          String    @id @default(cuid())
  coachId     String
  coach       Coach     @relation(fields: [coachId], references: [id], onDelete: Cascade)
  sessionId   String?
  userId      String
  userName    String
  rating      Int       // 1-5
  comment     String?
  createdAt   DateTime  @default(now())

  @@index([coachId])
  @@index([userId])
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
│            │       └──────────────────┘       └──────┬──────────┘
│            │                                        │
│            │──────▶┌──────────────────┐       ┌──────▼──────────┐
│            │       │    Booking       │       │ CoachCourtLink   │
│  (existing)│       │   (court-only)   │       └──────┬──────────┘
└───────────┘       └────────┬─────────┘              │
                             │                        │
                      ┌──────▼──────┐          ┌──────▼──────┐
                      │    Venue     │◀─────────│    Court     │
                      │ (1,976)      │          │  (10,581)    │
                      └─────────────┘          └─────────────┘
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
| `PATCH` | `/api/sessions/[id]` | Update session status (confirm, complete, cancel) | Coach |
| `PATCH` | `/api/sessions/[id]/payment` | Submit payment proof | Player |
| `POST` | `/api/sessions/[id]/join` | Join a group session | Player |
| `DELETE` | `/api/sessions/[id]/leave` | Leave a group session | Player |

### Credit APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/credits` | List player's credit balances (all coaches) | Player |
| `POST` | `/api/credits/purchase` | Buy a credit pack (initiates VietQR) | Player |
| `GET` | `/api/credits/[id]` | Credit detail + transaction history | Player |
| `PATCH` | `/api/credits/[id]/confirm` | Confirm credit pack payment | Coach |

### Court Owner APIs (Admin Extension)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/admin/venues/[id]/coaches` | List coaches at venue | Owner |
| `POST` | `/api/admin/venues/[id]/coaches/invite` | Invite coach to venue | Owner |
| `GET` | `/api/admin/venues/[id]/sessions` | All sessions at venue (coach-mediated) | Owner |
| `GET` | `/api/admin/venues/[id]/reports` | Revenue reports (direct vs. coach) | Owner |

---

## 14. Screen Inventory

### Player (Mobile — Expo)

| Screen | Type | Description |
|--------|------|-------------|
| `CoachListScreen` | Tab | Coach discovery with search/filter |
| `CoachProfileScreen` | Stack | Full coach profile + book CTA |
| `SessionBookingScreen` | Stack | Date → time → confirm flow |
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
- [ ] **Session management**: Accept/decline requests, mark complete
- [ ] **Profile settings**: Bio, pricing, bank account, policies

### Phase 5: Court Owner Web (Weeks 12–13)

- [ ] **Admin role extension**: Court owner role with venue scope
- [ ] **Dashboard enhancements**: Coach metrics, booking source breakdown
- [ ] **Coaches page**: List coaches at venue, invite flow
- [ ] **Revenue reports**: Direct vs. coach-mediated with charts

### Phase 6: Reviews & Polish (Week 14)

- [ ] **Review system**: Post-session rating + review
- [ ] **Coach rating aggregation**: Average + count
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
2. **Commission model**: Should CourtMap take a platform fee from coach sessions in the future?
3. **Push notifications**: Which notification service for mobile (Expo Push, FCM, APNs)?
4. **Chat**: Should players and coaches be able to message each other in-app?
5. **Recurring sessions**: Should players be able to book weekly recurring sessions with a coach?
6. **Multi-language**: Vietnamese and English support for coach profiles and UI?
