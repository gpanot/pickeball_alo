# CourtMap Admin Panel — Product Requirements Document

## Context

This spec covers a **lightweight venue admin panel** for CourtMap. It is a separate set of pages within the existing Next.js 15 app, reusing the same Prisma database, API patterns, and theme system. The admin panel lets venue owners/staff manage bookings and update venue information without touching the database directly.

**What already exists (do not rebuild):**
- Next.js 15 App Router, TypeScript, Prisma 6 with PostgreSQL
- Database models: Venue, Court, TimeSlot, Booking, UserProfile
- API routes: GET/POST/PATCH `/api/bookings`, GET `/api/venues`, GET `/api/venues/[id]`, GET/PUT `/api/profile`
- Booking status flow: pending > booked > paid / canceled
- PATCH `/api/bookings/[id]` already accepts `{ status: 'canceled' }`, extend it for other transitions
- Theme tokens in `lib/theme.ts`, DM Sans font, inline styles pattern

---

## Access Model (MVP)

No real auth for MVP. Admin access uses a **simple PIN per venue**.

**How it works:**
1. Admin navigates to `/admin`
2. Selects their venue from a dropdown (or types venue name to filter)
3. Enters a 4-6 digit PIN
4. PIN is stored in a new `adminPin` field on the Venue model (hashed with bcrypt)
5. On success, venue ID + a session token are stored in `localStorage` (`cm_admin_venueId`, `cm_admin_token`)
6. All subsequent admin API calls include the token in the request header
7. "Log out" clears localStorage

**Seed default PINs:** During `prisma/seed.ts`, set a default PIN (e.g. "1234") for all venues so testing works immediately.

Later this can be upgraded to proper auth (OTP to venue phone number, or Supabase auth).

---

## Database Changes

### Venue model — add field:
```prisma
model Venue {
  // ... existing fields
  adminPin    String?   // bcrypt hashed PIN for admin access
}
```

### Booking model — add fields:
```prisma
model Booking {
  // ... existing fields
  adminNote     String?   // venue owner's internal note
  reviewedAt    DateTime? // when status changed from pending
  reviewedBy    String?   // "admin" or venue name, for audit
}
```

Run `npx prisma migrate dev --name add-admin-fields` after schema changes.

---

## API Routes (new and modified)

### New routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login` | Body: `{ venueId, pin }`. Validates PIN against hashed `adminPin`. Returns `{ token, venueId, venueName }`. Token is a signed JWT or simple random string stored in a server-side session map. |
| GET | `/api/admin/bookings` | Query: `venueId`, `status` (optional filter), `date` (optional). Returns bookings for that venue. Requires admin token in header. |
| GET | `/api/admin/dashboard` | Query: `venueId`. Returns today's summary: total bookings, pending count, revenue (sum of booked+paid), court utilization percentage. |
| PUT | `/api/admin/venue` | Update venue info (hours, phone, social links, amenities). Body: partial venue fields. Requires admin token. |
| POST | `/api/admin/courts/[courtId]/slots` | Bulk update slots for a court on a given date. Body: `{ date, slots: [{ time, price, isBooked }] }`. Used to manually block/unblock slots or adjust pricing. |

### Modified routes

**PATCH `/api/bookings/[id]`** — Extend to accept:
- `{ status: 'booked' }` (approve pending booking)
- `{ status: 'paid' }` (mark as paid)
- `{ status: 'canceled', adminNote: '...' }` (reject/cancel with reason)
- Add validation: only allow valid state transitions per the state machine
- Set `reviewedAt` and `reviewedBy` on status change

---

## Admin UI Screens

All admin pages live under `/admin` route group. They use the same theme tokens but with a distinct admin header bar to differentiate from the player app.

### Admin Login (`/admin`)

Simple centered card on the page.

**Components:**
- CourtMap logo (smaller, with "Venue Admin" subtitle)
- Venue selector: searchable dropdown listing all venue names
- PIN input: 4-6 digit numeric field, masked
- "Sign In" button
- Error state: "Wrong PIN" message

After successful login, redirect to `/admin/dashboard`.

---

### Dashboard (`/admin/dashboard`)

The landing page after login. Quick overview of today's activity.

**Top bar:**
- Venue name (bold)
- "Log out" link (right side)
- Date display: "Wed, Apr 1 2026"

**Summary cards row (horizontal scroll on mobile):**
- **Pending:** count of bookings awaiting approval, orange accent
- **Confirmed today:** count of booked+paid bookings for today, green accent
- **Revenue today:** sum of totalPrice for booked+paid bookings today, formatted in VND
- **Courts active:** X of Y courts currently available (not maintenance)

**Pending bookings section:**
- Header: "Needs your action" with pending count badge
- List of pending booking cards (most recent first)
- Each card shows: booking reference (orderId, e.g. "CM-4A7F"), player name, phone (tappable to call), court + time, price, time since request ("2 min ago")
- Two action buttons per card: "Approve" (green) and "Reject" (red)
- Approve changes status to "booked" and updates the slot's `isBooked` to remain true
- Reject changes status to "canceled" and frees the slot (`isBooked` back to false)
- Optional: reject reason text field (popover or inline) saved to `adminNote`

**Today's schedule section:**
- Header: "Today's courts"
- Compact grid view: courts as rows, time slots as columns (horizontal scroll)
- Color coding: green = available, accent/lime = booked (confirmed), orange = pending, gray = past, red = maintenance
- Tapping a booked/pending slot shows a mini popover with player name + phone + status

**Navigation:**
- "All Bookings" link to full bookings list
- "Venue Settings" link to venue edit screen
- "Manage Courts" link to court/slot management

---

### All Bookings (`/admin/bookings`)

Full list of bookings for this venue with filtering.

**Top bar:** Back arrow + "All Bookings" + venue name

**Filter bar:**
- Status filter chips: All (default), Pending, Booked, Paid, Canceled
- Date picker: specific date or "All dates"
- Search by player name or phone

**Booking list:**
- Cards sorted by date descending, then time
- Each card:
  - Booking reference (orderId, e.g. "CM-4A7F", bold)
  - Status badge (same colors as player app: orange/green/blue/red)
  - Player name + phone (tappable)
  - Date + court + time
  - Price
  - Notes (if any, from player)
  - Admin note (if any, from previous admin action)
  - Created timestamp ("Apr 1, 5:32 AM")
- Action buttons (contextual):
  - Pending: "Approve" + "Reject"
  - Booked: "Mark Paid" + "Cancel"
  - Paid: no actions (terminal)
  - Canceled: no actions, card visually dimmed

**Bulk actions (nice to have, not MVP):**
- Select multiple pending bookings and approve all

---

### Venue Settings (`/admin/venue`)

Edit venue information that players see in the Info tab.

**Top bar:** Back arrow + "Venue Settings"

**Editable fields:**
- Venue name (text)
- Address (text)
- Phone number (text)
- Operating hours (text, e.g. "5:00 AM - 10:00 PM")
- Tags (multi-select or comma-separated: Indoor, Outdoor, AC, Lights, etc.)
- Amenities (multi-select checkboxes)
- Facebook URL (text, optional)
- Instagram URL (text, optional)
- TikTok URL (text, optional)
- Google Maps URL (text, optional)

**Non-editable fields (display only):**
- Rating + review count (sourced from scraper, not manually editable)
- Latitude / Longitude

**CTA:** "Save Changes" button

---

### Court & Slot Management (`/admin/courts`)

Manage individual courts and their time slots for a given date.

**Top bar:** Back arrow + "Courts & Slots"

**Date selector:** horizontal scrollable date chips (today + next 7 days)

**Court list:**
Each court is an expandable row:
- Court name + note + availability toggle (switch to mark as maintenance/available)
- "Edit" link to change court name or note

**Expanded court row shows time slots for selected date:**
- Grid of 30-min slots from venue open to close
- Each slot shows: time, price, booked status
- Tapping a slot opens an inline editor:
  - Price field (VND input)
  - Toggle: Available / Blocked
  - If booked by a player: show player name + phone, "Cancel booking" option
- "Block slot" manually marks it as booked (venue-side block, no booking record)
- "Unblock slot" frees it

**Add court button:** Creates a new court for the venue with a name and optional note.

**Bulk pricing (nice to have):**
- "Set price for all slots" for a given court + date range
- "Copy today's slots to tomorrow" for quick setup

---

## State Transitions (Admin Actions)

| Current Status | Admin Action | New Status | Side Effects |
|---|---|---|---|
| pending | Approve | booked | Set `reviewedAt`, `reviewedBy`. Slot stays `isBooked: true`. |
| pending | Reject | canceled | Set `reviewedAt`, `reviewedBy`, optional `adminNote`. Free the slot (`isBooked: false`). |
| booked | Mark Paid | paid | Set `reviewedAt`. |
| booked | Cancel | canceled | Set `reviewedAt`, optional `adminNote`. Free the slot. |

**Slot sync rule:** When a booking is canceled (by admin or player), all slots referenced in `booking.slots` JSON must have their corresponding `TimeSlot.isBooked` set back to `false` so they become available again for other players.

---

## Notifications (Post-MVP)

Not in scope for the initial build, but the data model supports it:

- When admin approves/rejects, the player should see updated status in "My Bookings"
- Future: push notification or SMS to player phone on status change
- Future: notification to admin when new booking request comes in

For MVP, players see status changes by refreshing "My Bookings" (polling or manual refresh).

---

## Routing Structure

```
/admin                  → Login screen
/admin/dashboard        → Dashboard (requires auth)
/admin/bookings         → All bookings list
/admin/venue            → Venue settings editor
/admin/courts           → Court & slot management
```

All `/admin/*` pages check for valid admin session in localStorage. If missing or expired, redirect to `/admin` login.

---

## Implementation Notes

1. **Reuse existing patterns:** API routes follow the same style as `app/api/bookings/route.ts`. Use Prisma client from `lib/generated/prisma`. Return JSON responses with proper status codes.

2. **Admin pages are server-rendered:** Unlike the player app (client-only SPA), admin pages can use standard Next.js server components where it makes sense. But for consistency and speed, client components with fetch calls to `/api/admin/*` are fine too.

3. **PIN hashing:** Use `bcryptjs` (pure JS, no native dependency issues on Vercel). Hash on seed/setup, compare on login.

4. **Token strategy (simple):** On successful login, generate a random UUID token. Store it in a simple in-memory Map on the server (`Map<token, { venueId, createdAt }>`). Check on each admin API request. Tokens expire after 24h. This avoids needing JWT libraries but works for MVP. On Vercel serverless, the map resets on cold starts, meaning admins need to re-login occasionally, which is acceptable for MVP.

5. **Mobile-friendly admin:** The admin panel should work on mobile (venue staff often use phones). Same max-width 430px shell, same DM Sans font. Use the existing theme tokens but add a subtle top banner or different accent color (e.g. blue instead of lime) to visually distinguish admin from player views.

6. **Slot freeing on cancel:** This is critical. When implementing PATCH `/api/bookings/[id]` with status "canceled", parse the `slots` JSON field from the booking, and for each slot entry, find the matching `TimeSlot` record (by courtId + date + time) and set `isBooked: false`. Wrap in a Prisma transaction.

7. **Double booking prevention (cross-ref Player PRD):** The POST `/api/bookings` route must atomically check slot availability and set `isBooked: true` inside a single Prisma transaction. If any requested slot is already booked, return HTTP 409 and do not create the booking. This prevents race conditions when two players book the same slot simultaneously.

8. **Booking reference ID (orderId):** All booking cards in the admin panel must display the `orderId` (e.g. "CM-4A7F") prominently so venue staff can reference it when communicating with players by phone. The orderId is auto-generated on booking creation (see Player PRD for format).

9. **Admin pricing changes reflected immediately:** The player-facing `/api/venues` and `/api/venues/[id]` routes must always query the database directly with no caching layer. When an admin updates slot prices or blocks/unblocks slots via `/api/admin/courts/[courtId]/slots`, the changes are visible to players on their next search or venue detail load. Do not add response caching (e.g. `Cache-Control`, in-memory cache, or ISR) to venue or slot API routes.
