# CourtMap — VietQR Payment Integration

## Overview

This document specifies the payment flow for **CourtMap** using VietQR. Money goes directly from the player to the venue’s bank account. CourtMap never touches the funds. The system generates a pre-filled QR code with the venue’s bank details, exact amount, and a **display order reference** as the transfer note so the player can pay in one scan.

**Implementation scope:** This PRD targets the CourtMap codebase in this repository (**Expo mobile app** + **Next.js API and admin**). Paths below are relative to the repo root.

This is a companion to the Player PRD and Admin PRD; align those documents when this spec ships.

---

## Flow Summary

```
Player books slots
  → Booking created (status: pending)
  → App shows VietQR with venue bank details, amount, and display ref as transfer note
  → Player scans QR in their banking app (or taps a deeplink, optional)
  → Money transfers directly: player bank → venue bank
  → Player returns to app, taps "I've paid"
  → Booking status: payment_submitted
  → Venue owner sees the booking flagged as "payment submitted" in admin dashboard
  → Venue owner checks their bank app, confirms transfer received
  → Venue owner taps "Confirm paid" → status: paid
  → (or "Not received" → status reverts to pending, player can retry)
```

---

## Booking Status Machine

```
[empty]
  → user submits booking form
[pending]
  → player taps "I've paid" after scanning QR
[payment_submitted]
  → admin confirms payment received
[paid] (terminal)

[pending]
  → user cancels
[canceled] (terminal)

[payment_submitted]
  → admin confirms payment NOT received
[pending] (reverted, player can retry)

[payment_submitted]
  → user cancels
[canceled] (terminal, venue owner should verify no transfer came through)

[pending]
  → admin rejects
[canceled] (terminal, slots freed)
```

**Status `booked` is removed.** There is no separate “venue approved, not yet paid” state. The venue’s confirmation is **payment confirmation** (`pending` → `payment_submitted` → `paid`).

```typescript
type BookingStatus =
  | "pending"             // Booking created, QR available, awaiting payment / "I've paid"
  | "payment_submitted"   // Player claims they paid, awaiting venue verification
  | "paid"                // Venue confirmed payment received
  | "canceled";           // Canceled by player or rejected by venue
```

### Implementation checklist: retire `booked`

When implementing, update every reference to `booked` in this repo, including:

| Area | Location |
|------|----------|
| Booking PATCH transitions, slot edit rules | `app/api/bookings/[id]/route.ts` |
| Admin dashboard (remove Approve; split queues) | `app/admin/dashboard/page.tsx` |
| Admin bookings filters and actions | `app/admin/bookings/page.tsx` |
| Dashboard aggregates | `app/api/admin/dashboard/route.ts` |
| Types | `lib/types.ts`, `mobile/lib/types.ts` |
| Player UI — cards, detail, timeline | `mobile/components/booking/BookingCard.tsx`, `mobile/components/booking/BookingDetailScreen.tsx` |
| Web PWA parity (if in scope) | `components/booking/BookingCard.tsx`, `components/booking/BookingDetail.tsx` |

### Dashboard metrics (admin)

Redefine stats in `app/api/admin/dashboard/route.ts` to match VietQR:

| Metric | Definition |
|--------|------------|
| **Pending** (e.g. `pendingCount`) | Bookings with `status === "pending"` — reservation held, player has not yet claimed payment (or is still expected to pay). |
| **Payment submitted** (surface in UI) | Bookings with `status === "payment_submitted"` — highest priority queue; venue must verify bank. |
| **Confirmed today** | Bookings with **local calendar** `date === today` and `status === "paid"` (optional: include `payment_submitted` only if product policy counts “awaiting verify” as confirmed — default: **`paid` only**). |
| **Revenue today** | Sum of `totalPrice` for today’s bookings with **`status === "paid"`** only. |

Document the exact `today` timezone rule next to code (UTC vs local) and keep it consistent with player date chips.

### Data migration from existing `booked` rows

If production already has `booked` bookings:

1. **`booked` → `paid`:** Use when the venue had already approved and you treat legacy rows as fully settled (no bank reconciliation needed).
2. **`booked` → `payment_submitted`:** Use when money may still be in flight or you want the venue to verify once in the new flow.
3. **`booked` → `pending`:** Conservative fallback if status was misused.

Pick **one** rule per deployment and run a one-off SQL/Prisma migration; document the choice in release notes.

---

## Data Model Changes

### VenuePayment — extend (do **not** add bank fields on `Venue`)

Bank accounts for payouts already live on **`VenuePayment`** (`prisma/schema.prisma`): `bank`, `accountName`, `accountNumber`, optional `qrImageUrl`, `sortOrder`. They are exposed on **`GET /api/venues/[id]`** and shown on the venue **Info** tab (`mobile/components/venue/InfoTab.tsx`).

**Add:**

```prisma
model VenuePayment {
  // ... existing fields
  bankBin                 String?   // 6-digit BIN for VietQR (e.g. "970436" for Vietcombank)
  isDefaultForDynamicQr   Boolean   @default(false)  // exactly one per venue should be true when multiple rows exist
}
```

**Rules:**

- **Dynamic VietQR** (amount + `addInfo` per booking) is built from **the single default row**: `isDefaultForDynamicQr === true` and valid `bankBin`, `accountNumber`, and `accountName`. If no row is marked default, fall back to the **first** row (by `sortOrder`) that has all three fields valid.
- **`qrImageUrl`:** Optional **static** merchant QR. If dynamic VietQR **cannot** be built (missing BIN, etc.) but `qrImageUrl` exists, show static QR plus **manual** amount and note (copy fields). If neither works, show “contact venue” (see Edge cases).

**bankBin** reference: full list at https://api.vietqr.io/v2/banks. Common examples:

- Vietcombank: 970436  
- MB Bank: 970422  
- Techcombank: 970407  
- VietinBank: 970415  
- BIDV: 970418  
- ACB: 970416  
- TPBank: 970423  
- Sacombank: 970403  

### Booking — payment tracking fields

```prisma
model Booking {
  // ... existing fields
  paymentSubmittedAt    DateTime?   // when player tapped "I've paid"
  paymentConfirmedAt    DateTime?   // when admin confirmed payment
  paymentNote           String?     // optional: "not received" reason, wrong amount notes (payment verification flow)
}
```

**`adminNote` vs `paymentNote`:** Keep **`adminNote`** for booking rejection / general admin messages. Use **`paymentNote`** for payment-verification context (e.g. admin “Not received: transfer not found”, “Paid 100k instead of 135k”). Avoid overloading one field for both.

---

## Transfer note (`addInfo`) and order reference

### Display ref must match VietQR

The app already shows a short order reference via **`formatBookingOrderRef(orderId)`** in `lib/formatters.ts` (e.g. **`CM-4A7F`** — `CM-` plus a short alphanumeric slice of the stored `orderId`).

**Requirement:** The `addInfo` query parameter passed to VietQR **MUST** be the **same string** the player sees in the UI (i.e. `formatBookingOrderRef(booking.orderId)`), **not** the raw database `orderId`, so bank notifications match **All bookings** search and on-screen copy.

### Length caveat

VietQR / EMV payloads may limit the length of the transfer description. If `img.vietqr.io` or bank apps truncate `addInfo`, prefer the **short display ref** only (already compact). If truncation still occurs, document the observed limit in code comments and adjust copy UX (“use full note if your bank allows”).

---

## Player-Side UI/UX (mobile-first)

Use design tokens from `mobile/lib/theme.ts` and [docs/figma-theme-handoff.md](docs/figma-theme-handoff.md): **DM Sans**, primary CTA **`t.accent`** (`#B8F200`), dark surfaces. Format money with **`formatVndFull`** from `lib/formatters.ts` (same helpers as web where shared).

### Post-submit: venue detail sheet → confirmation step

After **`BookingForm`** submit, the flow stays inside **`VenueDetailScreen`** (`mobile/components/venue/VenueDetailScreen.tsx`) as sheet step **`confirmation`** (today: `detail` → `booking` → `confirmation`). **Replace or extend** **`BookingConfirmation`** (`mobile/components/booking/BookingConfirmation.tsx`) with the VietQR payment content — not a separate generic “bottom sheet” elsewhere.

**Layout (top to bottom):**

1. **Status:** Accent check + **“Booking request sent!”**
2. **Summary card:**
   - Large **display ref** (`formatBookingOrderRef(orderId)`)
   - Venue name
   - Date, courts, time slots
   - Total: **`formatVndFull(totalPrice)`**
3. **Section title:** “Pay to confirm your booking”
4. **VietQR:**
   - Image ~**240×240** logical px, centered
   - **White background** behind the QR (required for scan contrast on dark theme)
   - Below: holder + masked account (e.g. `***1234`), bank label
5. **Transfer details** (read-only) with **copy** actions: bank, account, name, amount, note = display ref. Use **Clipboard** API; provide accessibility labels and optional haptics.
6. **“Open banking app”** (optional MVP): deeplink if available.
7. **Primary CTA “I've paid”:** sets `payment_submitted`, `paymentSubmittedAt`; then short confirmation: “Payment submitted! The venue will verify shortly.” / waiting state.
8. **Secondary “Pay later”** or **Done:** dismisses sheet; booking stays **`pending`**; player can pay from **My Bookings**.

**UX priority:** Do not bury payment below a single “Done” path. Keep **pay** and **I've paid** more prominent than dismiss so users do not skip payment by accident.

### Info tab vs booking payment

**Info tab** payment cards are **informational** (general venue accounts). **Booking-specific** VietQR (correct **amount** and **addInfo**) must appear on the **confirmation step** and **booking detail / Pay now**, not only on Info tab.

### My Bookings — cards and detail

- **`BookingCard`** (`mobile/components/booking/BookingCard.tsx`): badges and actions per status (`pending` → Pay now, Cancel; `payment_submitted` → verifying, Cancel with warning; `paid` / `canceled` as spec).
- **`BookingDetailScreen`** (`mobile/components/booking/BookingDetailScreen.tsx`): timeline steps **`pending` → `payment_submitted` → `paid`** (remove **`booked`**). **Pay now** opens the **same** VietQR module as post-submit.

### Web PWA (optional)

If the web booking flow remains in scope, mirror mobile behavior in `components/booking/BookingConfirmation.tsx` and related booking UI for parity.

---

## Admin-Side UI/UX

### Dashboard — “Needs your action”

Implement two queues (e.g. two lists or sections):

1. **Payment submitted** (highest priority): `status === "payment_submitted"`. Actions: **Confirm paid**, **Not received** (optional reason → `paymentNote`, revert to `pending`).
2. **New requests:** `status === "pending"`. Player has not claimed payment yet; slots are held. Action: **Reject** only (→ `canceled`, free slots).

**Remove “Approve”** (`pending` → `booked`). File: `app/admin/dashboard/page.tsx`.

### All Bookings

Status filter chips: **All, Pending, Payment submitted, Paid, Canceled** (`app/admin/bookings/page.tsx`). Add **search by display ref** (and raw `orderId` if stored) so venues can match bank descriptions to a row.

### Bank / VietQR setup — Admin → Payments

Configure accounts on **`/admin/payments`** (`app/admin/payments/page.tsx`) and **`/api/admin/payments`**, not a separate “venue settings” screen.

**Fields (per `VenuePayment`):**

- Bank name (searchable; drives **BIN** auto-fill)
- **Bank BIN** (6 digits; auto-filled from bank pick)
- Account number
- Account holder (must match bank records for VietQR)
- Optional **static** `qrImageUrl`
- **Default for dynamic QR** toggle: **`isDefaultForDynamicQr`** (enforce **at most one** `true` per venue)

**Validation:**

- Dynamic QR requires BIN + account + name on the **default** row.
- **Preview:** Link or embedded image for sample `https://img.vietqr.io/...` with **1 000** VND so the owner can verify scanning.

**Banner:** If no row can produce dynamic QR, show: “Add bank BIN and account on Payments so players can pay via VietQR.”

---

## VietQR Technical Implementation

### QR generation (image API)

```
https://img.vietqr.io/image/{bankBin}-{accountNumber}-compact.png?amount={amount}&addInfo={encodedDisplayRef}&accountName={encodedName}
```

**Example:**

```
https://img.vietqr.io/image/970436-0123456789-compact.png?amount=135000&addInfo=CM-4A7F&accountName=NGUYEN%20VAN%20A
```

- `amount`: integer VND, no decimals  
- `addInfo`: **URL-encoded** `formatBookingOrderRef(orderId)`  
- `accountName`: URL-encoded holder from **`VenuePayment.accountName`**

**Alternative:** Client-side EMV payload + QR library — see https://www.vietqr.io/danh-sach-api/generate-qr-code-api. MVP: image API.

### QR display

- ~240×240 logical px; padding for camera scan  
- White mat behind QR  
- Supporting text ~13px  

---

## API Changes

### PATCH `/api/bookings/[id]`

Support:

```typescript
// Player marks payment submitted (requires ownership — see Security)
{ status: "payment_submitted", userId: "<booking.userId>" }

// Admin confirms payment
{ status: "paid" }  // + admin auth headers; sets paymentConfirmedAt

// Admin: not received
{ status: "pending", paymentNote: "Transfer not found" }  // clears paymentSubmittedAt; set paymentNote

// Player or admin cancel
{ status: "canceled", adminNote?: "..." }  // frees slots in transaction
```

**Transition rules:**

```
pending → payment_submitted   (player only, ownership verified)
pending → canceled            (player or admin)
payment_submitted → paid      (admin only)
payment_submitted → pending   (admin only, "not received")
payment_submitted → canceled  (player only, with warning)
paid → (terminal)
canceled → (terminal)
```

### Security (non-negotiable)

Player-initiated status changes (**`payment_submitted`**, and **`canceled`** when the player is allowed to cancel) **MUST** verify the caller is the booking owner: require **`userId`** in the body (or session) and **`userId === booking.userId`**. Reject with **403** otherwise.

Admin transitions continue using **`adminAuthHeaders`** / `requireAdminVenue` patterns already used on admin routes.

### GET `/api/banks`

Return bank list + BIN for the admin Payments form.

- **MVP:** Option B — static JSON (top ~20 banks) in repo; no runtime dependency on vietqr.io.  
- **Later:** proxy `https://api.vietqr.io/v2/banks` with cache (e.g. 24h).

---

## Edge Cases

**Player paid but never tapped “I've paid”:**  
Booking stays `pending`. Venue matches bank text to **display ref**; admin finds booking via **All bookings search**. Optionally allow admin to set **`paid`** from `pending` with audit (future).

**Player tapped “I've paid” but did not pay:**  
**Not received** → `pending`; player sees QR again.

**Wrong amount:**  
Venue contacts player; **`paymentNote`** records detail; confirm or reject as policy allows.

**Wrong account (manual transfer):**  
**Not received**; player contacts bank. Scanning dynamic QR avoids wrong account if banks honor payload.

**Venue cannot build dynamic VietQR:**  
If default `VenuePayment` lacks BIN/account/name: message + **tappable `venue.phone`**. If only **static** `qrImageUrl`: show image + **manual** amount and display ref to copy. Booking remains `pending` until venue confirms.

**Cancel after `payment_submitted`:**  
Warn: refund is between player and venue; then `canceled`, free slots.

**Unique transfer description:**  
Each booking has unique `orderId`; display ref derived from it — collisions extremely unlikely if ref length is sufficient.

---

## Database migration

```bash
npx prisma migrate dev --name add-vietqr-payment
```

**Suggested changes:**

- **`VenuePayment`:** `bankBin String?`, `isDefaultForDynamicQr Boolean @default(false)`
- **`Booking`:** `paymentSubmittedAt DateTime?`, `paymentConfirmedAt DateTime?`, `paymentNote String?`

**Seed** (`prisma/seed.ts`): add `bankBin` and default flag to sample `payments` for test venues.

---

## Before vs after (this product)

| Step | Before (manual / approval-first) | After (VietQR in CourtMap) |
|------|----------------------------------|----------------------------|
| After submit | “Request sent”, wait for venue approve | Same sheet: **pay** with QR + amount + note |
| Venue action | Approve → booked → mark paid | **Reject** pending **or** verify **payment_submitted** → **paid** |
| Player confirm pay | N/A or off-app | One tap **“I've paid”** |
| Bank matching | Ad-hoc | **Display ref** in notification = in-app copy |

---

## User stories & QA (aligned with current UI)

Use these to regression-test VietQR end-to-end. **Court manager** flows match `app/admin/*` as implemented.

### Access and navigation

- Sign in at **`/admin`** (venue token). After login, the shell shows **COURTMAP ADMIN** and the venue name.
- Primary nav links (same order as the header): **`/admin/dashboard`** (Dashboard), **`/admin/bookings`** (Bookings), **`/admin/venue`** (Venue), **`/admin/courts`** (Courts), **`/admin/payments`** (Payments).

### Player stories (mobile / web parity)

1. **Pay right after booking** — After submitting a booking, the confirmation step shows VietQR (or static QR / call venue). Amounts use **`formatVndFull`**. Primary CTA on mobile: **I HAVE PAID**; secondary: **Pay later**. Web PWA uses the same flow in `components/booking/BookingConfirmation.tsx` (**I HAVE PAID** / **Pay later**).
2. **Pay later** — Dismiss without **I HAVE PAID**; booking stays **`pending`**; open **My Bookings** and use **Pay now** when ready (same VietQR module as confirmation).
3. **After I HAVE PAID** — Status becomes **`payment_submitted`**; UI shows payment submitted / verifying until the venue confirms.
4. **Cancel** — From **`pending`**, player can cancel. From **`payment_submitted`**, cancel is allowed with your warning copy; expect **`canceled`** and slots freed per API rules.
5. **Another user cannot claim payment** — `PATCH` with wrong `userId` for **payment_submitted** must fail (**403**).

### Court manager — configure payments (`/admin/payments`)

6. **Page title** — **Payment methods** with intro copy about bank accounts and QR shown when players book.
7. **Add method** — **+ Add payment method** opens the form. Required fields: **Bank**, **Account name**, **Account number** (see alerts if missing). **Bank** uses a datalist fed from **`GET /api/banks`**; choosing a listed bank auto-fills **Bank BIN (6 digits, VietQR)** when the name matches.
8. **Dynamic VietQR** — Check **Default account for dynamic VietQR (one per venue)** so the app picks one row for `img.vietqr.io`. When BIN + account + name are valid, **Open VietQR preview image** appears (**Test QR (1.000 ₫, ref CM-PREVIEW)**).
9. **Banner** — If the venue has payment rows but **no** valid default dynamic QR setup, the orange banner says: *Add a valid 6-digit bank BIN and mark one account as default for dynamic VietQR so players get a prefilled payment QR.*
10. **Static QR** — Optional **QR code image** upload (under 2 MB); stored as data URL. **Edit** / **Save** / **Delete** on each row; delete confirms with *Delete this payment method?*

### Court manager — dashboard (`/admin/dashboard`)

11. **Stat chips** (top row): **Pending pay**, **Verify pay**, **Paid today**, **Revenue today**, **Courts active** — confirm counts move correctly when bookings change status (today’s metrics follow `toLocalDateKey` / **`paid`** only for revenue where implemented).
12. **Verify payment** — Subtitle: *Player marked “I've paid”. Check your bank, then confirm or send back to pending.* Empty state: *No bookings awaiting payment verification.* Each card shows display ref (**`CM-…`**), player name, phone link, slots, **{amount} · submitted {relative time}**.
    - **Confirm paid** → **`paid`**.
    - **Not received** → expands a note field (*Note (optional, e.g. transfer not found)*) with **Confirm not received** (→ **`pending`** + **`paymentNote`**) and **Cancel** to collapse without saving.
13. **New requests** — Subtitle: *Awaiting player payment. Reject if you cannot host the booking.* Empty: *No new unpaid requests.* Only action on each **`pending`** card: **Reject** → optional *Reason (optional)* → **Confirm reject** (→ **`canceled`** with **`adminNote`**) or **Cancel**. There is **no Approve** button.
14. **Today’s courts** — Schedule grid below; unrelated to VietQR but useful smoke test after login.

### Court manager — all bookings (`/admin/bookings`)

15. **Filters** — Chips: **all**, **pending**, **payment_submitted**, **paid**, **canceled** (capitalization is CSS `capitalize` on labels).
16. **Date** — Optional date filter + **Clear date (all dates)**.
17. **Search** — Placeholder: *Search name, phone, or order ref (CM-…)*; debounced query param **`q`** to **`/api/admin/bookings`**.
18. **Row details** — Shows **Player:** notes, **Admin:** `adminNote`, **Payment:** `paymentNote` when set.
19. **Actions by status**
    - **`pending`**: **Reject** → **Confirm reject** (same pattern as dashboard).
    - **`payment_submitted`**: **Confirm paid**, **Not received** → note → **Confirm not received** (→ **`pending`** + **`paymentNote`**).

### API checks (optional)

- **`PATCH /api/bookings/:id`**: player transitions require matching **`userId`**; admin transitions require **`Authorization`** headers as in **`adminAuthHeaders`** (`lib/admin-api.ts`).
- **`GET /api/venues/:id`**: payment objects include **`bankBin`**, **`isDefaultForDynamicQr`** for client-side VietQR URL building.

### Out of product UI (documented limitation)

- Admin cannot mark **`paid`** from **`pending`** without the player tapping **I HAVE PAID** first — see **Future** below.

---

## Future (out of scope unless prioritized)

- Push notifications when status moves to `paid` or reverts to `pending`
- Admin marking **`paid`** from `pending` when player forgot “I've paid”

---

## Companion document updates

When shipping, update the Player PRD and Admin PRD to:

- Remove **booked** / **Approve** language  
- Describe **Pay now**, **I've paid**, and **Confirm paid** / **Not received**  
- Point bank setup to **Admin → Payments** and this document  
