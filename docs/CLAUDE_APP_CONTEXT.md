# CourtMap (AloBo / pickeball_alo) — context for AI assistants

This document summarizes what the app is, how it is built, and what is already implemented. Attach or paste it when starting a new conversation so Claude (or another model) can work with accurate assumptions.

---

## Product intent

**CourtMap** is a mobile-first web app for discovering **pickleball courts in Vietnam** (AloBo-style data). Users can:

- Search with date, preferred start time, and session duration (UI state).
- Browse **results** sorted by distance, price, or rating.
- Open a **map** (Leaflet) with the same venue set.
- **Save** venues (IDs in `localStorage`).
- Open **venue detail**: info, availability-style time slots per court, multi-slot selection, and a **booking flow** that creates records via API.
- See **My bookings** and cancel (status → `canceled`).
- Edit **profile** (name, phone) stored locally; optional sync with `UserProfile` in the database via profile API.

Branding in UI: “COURTMAP” with a pickleball emoji; metadata title: **CourtMap — Pickleball Vietnam**.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 15** (App Router), **TypeScript** |
| UI | **React 19**, inline styles + theme tokens in `lib/theme.ts` (dark/light) |
| Map | **Leaflet**, loaded only on the client (`next/dynamic` with `ssr: false`) |
| Database | **PostgreSQL** via **Prisma 6** (client generated to `lib/generated/prisma`) |
| Deploy | **Vercel** (`vercel.json`); PWA: `public/manifest.json`, `public/sw.js` |

Package name in `package.json`: `pickeball_alo`.

---

## Runtime architecture

1. **`app/page.tsx`** dynamically imports **`components/CourtMapApp.tsx`** with `ssr: false` so the whole shell runs in the browser (map and browser APIs).
2. **`CourtMapApp`** is the **single-page controller**: holds screen state, search params, venues list, bookings, saved IDs, user id/name/phone, venue detail overlay, and wires **BottomNav**, **ResultsFlowPills**, and **ThemeToggle**.
3. **Data for venues and bookings** comes from **Next.js Route Handlers** under `app/api/`, not from reading `courts.json` at request time in the app UI.
4. **`lib/api.ts`** is the client fetch layer (`BASE` is `''` — same-origin `/api/...`).

### Default “user location” for distance

Search uses a fixed reference point **HCMC core** when calling the API: **lat 10.79, lng 106.71**, radius **10 km** (see `CourtMapApp` → `searchVenues` and `app/api/venues/route.ts` defaults). There is no live GPS integration in the described flow.

---

## Database model (Prisma)

Defined in `prisma/schema.prisma`:

- **Venue** — identity, address, `lat`/`lng`, contact, hours, rating, price range, tags, amenities, image URLs, social links.
- **Court** — belongs to venue; `name`, `note`, `isAvailable`.
- **TimeSlot** — per court, per **`date` string (YYYY-MM-DD)**; `time`, `price` (VND), `isBooked`.
- **Booking** — denormalized venue fields, `userId`, user name/phone, `date`, **`slots` as JSON**, `totalPrice`, `notes`, `status` (string, e.g. `pending`, `canceled`).
- **UserProfile** — `phone` unique, `name`, `savedVenues` string array (API exists; saved venues in the main UI are still primarily **localStorage** unless you wire profile sync everywhere).

Migrations live under `prisma/migrations/`.

---

## API surface (implemented)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/venues` | Query: `q`, `date`, `sort` (`distance` \| `price` \| `rating`), `lat`, `lng`, `radius`. Returns venues with courts and slots for that date; filters by radius; sorts. |
| GET | `/api/venues/[id]` | Single venue for a given `date` query. |
| GET | `/api/bookings?userId=` | List bookings for anonymous/local `userId`. |
| POST | `/api/bookings` | Create booking (`status` starts as `pending`). |
| PATCH | `/api/bookings/[id]` | e.g. cancel: `{ status: 'canceled' }`. |
| GET | `/api/profile/[phone]` | Load profile by phone. |
| PUT | `/api/profile` | Upsert profile. |

**Note:** `lib/api.ts` builds query params including `startHour` / `period` for search, but the current **`/api/venues` route implementation** only reads `q`, `date`, `sort`, `lat`, `lng`, `radius`. Duration and start hour mainly drive **UI and slot selection** in venue detail, not server-side filtering of the venue list.

---

## Data pipeline: from scrape to DB

1. **Scraper** (`scraper/`) — Node scripts to capture/export AloBo-related data; **`scraper/export_for_viewer.js`** writes `scraper/output/courts.json` and copies to **`public/courts.json`** when `public/` exists.
2. **`public/courts.json`** — Large static export (~2k venues mentioned in seed comments); useful for PWA cache and as **seed input**, not the live read path for the Next UI.
3. **`prisma/seed.ts`** — Reads `public/courts.json`, creates `Venue` / `Court` / `TimeSlot` rows. Generates synthetic half-hour slots for several future days (`buildStandardSlots`). Optional **`SEED_RADIUS_KM`** limits to venues near the same HCMC reference point for faster seeds.

Local dev needs **`DATABASE_URL`** in `.env` for Prisma and API routes.

---

## UI screens and navigation

`Screen` type in `lib/types.ts`: `'search' | 'results' | 'map' | 'saved' | 'bookings' | 'profile'`.

| Screen | Component | Behavior |
|--------|-----------|----------|
| Search | `SearchScreen` | Query + date chips + duration + start time; triggers search → results. |
| Results | `ResultsScreen` | List, sort, refine search, open detail, quick book. |
| Map | `MapScreen` (dynamic) | Leaflet map, same venue props as results. |
| Saved | `SavedScreen` | Subset of venues whose ids are in `savedIds`; can open from results flow (pills). |
| Bookings | `MyBookingsScreen` | Lists API bookings; cancel. |
| Profile | `ProfileScreen` | Name/phone, dark mode, links to other tabs. |

**BottomNav** — Book (search/results), Saved, My Bookings (shown on search, bookings, profile, and saved when not in “results flow”).

**ResultsFlowPills** — Toggle **List ↔ Map**, open Saved from results/map/saved-flow contexts.

**VenueDetail** — Tabs (e.g. availability vs info via `AvailabilityTab` / `InfoTab`), slot grid, booking form, confirmation.

---

## Important shared modules

- **`lib/types.ts`** — `VenueResult`, `CourtResult`, `SlotResult`, `BookingResult`, `SearchParams`, etc.
- **`lib/formatters.ts`** — Price formatting (VND → compact “k”), local date keys, slot sorting (`00:00` after evening), `getNextDays`, `DURATIONS`, `START_HOUR_OPTIONS`, `pickSlotsForSearch`, map price tiers.
- **`lib/theme.ts`** — `darkTheme` / `lightTheme` tokens passed as `t`.
- **`lib/useLocalStorage.ts`** — Persisted keys: `cm_dark`, `cm_saved`, `cm_userId`, `cm_userName`, `cm_userPhone`.

---

## Styling and UX conventions

- Max width **430px**, centered — phone-shaped shell.
- Font: **DM Sans** (Google Fonts in `app/layout.tsx`).
- Theme toggle: floating on most screens except search/profile.
- Heavy use of **inline `style={{ ... }}`** and small injected `<style>` blocks in `CourtMapApp` for keyframes.

---

## Legacy and adjacent files (not the main Next app)

- **`viewer.html`** — Standalone HTML viewer; may still be useful for quick static inspection; the **primary app** is Next.js.
- **`courtmap-prototype.jsx`** — Earlier prototype.
- **`alobo_extension 2/`** — Browser extension (hook/background/content) — separate from the Next bundle.

---

## Commands (reference)

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npx prisma migrate dev
npx prisma db seed   # or npm run db:seed
```

Regenerate static JSON from scraper: `node scraper/export_for_viewer.js`.

---

## Gaps and caveats (for implementers)

- **No real payments** — Bookings are stored as `pending` (or updated to `canceled`); no gateway integration described in code.
- **Anonymous user id** — Generated client-side (`cm_userId`); not a full auth system.
- **Saved venues** — Primarily `localStorage`; `UserProfile.savedVenues` exists in DB but may not be fully synchronized with every UI action.
- **Search API vs UI** — Duration and some query params may not all be applied server-side; confirm `app/api/venues/route.ts` when adding features.
- **README.md** in the repo may lag the codebase (e.g. older component names); trust **`CourtMapApp`** and this doc for the current shell.

---

*Last aligned with repository structure: single Next app entry at `/`, Prisma PostgreSQL backend, client-heavy map and booking UX.*
