# CourtMap — VietQR Payment Integration

## Overview

This document specifies the payment flow for CourtMap using VietQR. Money goes directly from the player to the venue's bank account. CourtMap never touches the funds. The system generates a pre-filled QR code with the venue's bank details, exact amount, and booking reference so the player can pay in one scan.

This is a companion to the Player PRD and Admin PRD. Changes to those documents are listed at the end.

---

## Flow Summary

```
Player books slots
  → Booking created (status: pending)
  → App shows VietQR with venue bank details, amount, and orderId as transfer note
  → Player scans QR in their banking app (or taps the deeplink)
  → Money transfers directly: player bank → venue bank
  → Player returns to app, taps "I've paid"
  → Booking status: payment_submitted
  → Venue owner sees the booking flagged as "payment submitted" in admin dashboard
  → Venue owner checks their bank app, confirms transfer received
  → Venue owner taps "Confirm payment" → status: paid
  → (or "Not received" → status reverts to pending, player is notified to retry)
```

---

## Updated Booking Status Machine

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

**New status added: `payment_submitted`**

Full status type:
```typescript
type BookingStatus =
  | "pending"             // Booking request sent, QR shown, awaiting payment
  | "payment_submitted"   // Player claims they paid, awaiting venue verification
  | "paid"                // Venue confirmed payment received
  | "canceled";           // Canceled by player or rejected by venue
```

Note: The "booked" status from the original PRD is removed. With VietQR integration the flow goes pending > payment_submitted > paid. There is no separate "approved but unpaid" state. The venue approves by confirming payment.

---

## Data Model Changes

### Venue — add bank details

```prisma
model Venue {
  // ... existing fields
  bankName      String?   // e.g. "Vietcombank", "MB Bank", "Techcombank"
  bankBin       String?   // BIN code per VietQR spec (e.g. "970436" for Vietcombank)
  bankAccount   String?   // account number
  bankHolder    String?   // account holder name as registered with the bank
}
```

**bankBin** is the 6-digit Bank Identification Number used by VietQR to route to the correct bank. Each Vietnamese bank has a unique BIN. See full list at https://api.vietqr.io/v2/banks. Common examples:
- Vietcombank: 970436
- MB Bank: 970422
- Techcombank: 970407
- VietinBank: 970415
- BIDV: 970418
- ACB: 970416
- TPBank: 970423
- Sacombank: 970403

### Booking — add payment tracking fields

```prisma
model Booking {
  // ... existing fields
  paymentSubmittedAt    DateTime?   // when player tapped "I've paid"
  paymentConfirmedAt    DateTime?   // when admin confirmed payment
  paymentNote           String?     // admin note if payment issue (e.g. "wrong amount")
}
```

---

## Player-Side Screens

### Booking Confirmation (bottom sheet, after form submit)

Current spec shows a success checkmark. Replace with VietQR payment screen.

**Layout (top to bottom):**

1. **Status indicator:** green checkmark + "Booking request sent!"

2. **Booking summary card:**
   - orderId displayed large (e.g. "CM-4A7F")
   - Venue name
   - Date + court + time slots
   - Total amount in VND: "135,000 VND"

3. **Payment section header:** "Pay to confirm your booking"

4. **VietQR code:**
   - Large QR image (240x240px), centered
   - Below QR: venue bank holder name + masked account number (e.g. "NGUYEN VAN A - ***1234")
   - Below that: bank name + logo if available

5. **Transfer details (read-only, for manual transfer):**
   - Bank: "Vietcombank"
   - Account: "0123456789"
   - Name: "NGUYEN VAN A"
   - Amount: "135,000 VND"
   - Note/Description: "CM-4A7F" (the orderId)
   - Copy button next to each field

6. **"Open banking app" button (optional):** deeplink to popular banking apps if available. Not critical for MVP, the QR scan covers this.

7. **"I've paid" CTA button:** full-width, lime green. Tapping this:
   - Changes booking status from "pending" to "payment_submitted"
   - Sets `paymentSubmittedAt` timestamp
   - Shows confirmation: "Payment submitted! The venue will verify and confirm shortly."
   - Transitions to a waiting state view (see below)

8. **"Pay later" link (secondary):** closes the sheet, booking stays as "pending". Player can return to My Bookings later to see the QR and complete payment.

**Important:** The QR is shown immediately after booking creation. No extra taps between booking and seeing the QR.

### My Bookings — Updated Card States

**Pending (not yet paid):**
- Orange badge: "Pending payment"
- "Pay now" button opens the VietQR payment screen for this booking
- "Cancel" button

**Payment Submitted (waiting for venue verification):**
- Yellow/amber badge: "Verifying payment"
- Subtitle: "The venue is checking your payment"
- No action buttons (player waits)
- "Cancel" button (with warning: "Are you sure? If you already transferred, contact the venue.")

**Paid (confirmed):**
- Green badge: "Confirmed & Paid"
- No action buttons (terminal)
- Show confirmed time, court, date

**Canceled:**
- Red badge: "Canceled"
- Grayed out card
- "Rebook" button

### My Bookings — Payment Screen (re-entry)

When a player taps "Pay now" on a pending booking in My Bookings, show the same VietQR payment screen as the booking confirmation. All the same components: QR, bank details, copy buttons, "I've paid" CTA.

---

## Admin-Side Changes

### Dashboard — Pending Section Update

The "Needs your action" section now has two sub-categories:

**1. "Payment submitted" bookings (highest priority):**
- These are bookings where the player says they paid
- Card shows: orderId, player name, phone, court + time, amount, time since payment submitted
- Two buttons:
  - **"Confirm paid"** (green) — sets status to "paid", sets `paymentConfirmedAt`
  - **"Not received"** (orange) — reverts status to "pending", sets `paymentNote` with optional reason, player sees booking back as "pending payment" and can retry or contact venue

**2. "New requests" (lower priority):**
- Bookings in "pending" where player has not yet tapped "I've paid"
- These are just reservation holds waiting for payment
- Card shows: orderId, player name, phone, court + time, amount, time since created
- One button:
  - **"Reject"** (red) — cancels booking, frees slots

**Admin does NOT "approve" bookings anymore.** The approval is the payment confirmation. This simplifies the flow: venue owner only needs to check their bank and tap one button.

### Admin — Venue Settings Update

Add a "Bank Details" section to venue settings:

**Fields:**
- Bank name (dropdown from VietQR bank list, or searchable select)
- Bank BIN (auto-filled based on bank name selection)
- Account number (text input)
- Account holder name (text input, must match bank records exactly for VietQR)

**Validation:**
- All four fields required before VietQR works
- Show preview: generate a sample QR with 1,000 VND amount so the venue owner can scan and verify their details are correct

**Warning banner if bank details are missing:** "Add your bank details in Venue Settings so players can pay you directly."

### All Bookings — Updated Status Filter

Status filter chips update to: All, Pending, Payment Submitted, Paid, Canceled

(Remove "Booked" from filter options since that status no longer exists.)

---

## VietQR Technical Implementation

### QR Generation

Use the free VietQR image API. No authentication required.

**URL format:**
```
https://img.vietqr.io/image/{bankBin}-{accountNumber}-compact.png?amount={amount}&addInfo={orderId}&accountName={encodedName}
```

**Example:**
```
https://img.vietqr.io/image/970436-0123456789-compact.png?amount=135000&addInfo=CM-4A7F&accountName=NGUYEN%20VAN%20A
```

**Parameters:**
- `bankBin`: 6-digit BIN from venue record
- `accountNumber`: from venue record
- `amount`: total booking price in VND (integer, no decimals)
- `addInfo`: the orderId (e.g. "CM-4A7F"), used as transfer description/note
- `accountName`: URL-encoded bank holder name

**Alternative: client-side QR generation**

If you prefer not to depend on the VietQR image API (for offline or speed), generate the QR client-side:

1. Install `qrcode.react`
2. Build the VietQR payload string following the EMVCo QR standard:
   - The VietQR format is documented at https://www.vietqr.io/danh-sach-api/generate-qr-code-api

For MVP, the image API approach is simpler and recommended. Switch to client-side only if the API is unreliable.

### QR Display Sizing

- On the payment screen: 240x240px QR image
- Below QR: bank info text at 13px
- Enough padding around QR for phone cameras to scan easily
- White background behind QR regardless of app theme (QR codes need contrast)

### Transfer Description Matching

The `addInfo` parameter sets the transfer note/description. This is what appears in the venue owner's bank statement. By using the orderId (e.g. "CM-4A7F"), the venue owner can:

1. See "CM-4A7F" in their bank notification
2. Open admin dashboard
3. Find the matching booking by orderId
4. Tap "Confirm paid"

This eliminates the need for screenshot uploads entirely.

---

## API Changes

### Modified Routes

**PATCH `/api/bookings/[id]`** — extend to support:

```typescript
// Player marks payment as submitted
{ status: "payment_submitted" }
// Sets paymentSubmittedAt = now()

// Admin confirms payment received
{ status: "paid" }
// Sets paymentConfirmedAt = now()

// Admin says payment not received, revert to pending
{ status: "pending", paymentNote: "Transfer not found" }
// Clears paymentSubmittedAt, sets paymentNote

// Player or admin cancels
{ status: "canceled" }
// Frees slots (isBooked = false) in transaction
```

**Validation rules for transitions:**
```
pending → payment_submitted   (player only)
pending → canceled            (player or admin)
payment_submitted → paid      (admin only)
payment_submitted → pending   (admin only, "not received")
payment_submitted → canceled  (player only, with warning)
paid → (no transitions, terminal)
canceled → (no transitions, terminal)
```

### New Route

**GET `/api/banks`** — returns the VietQR bank list for the admin venue settings dropdown.

Option A: proxy from `https://api.vietqr.io/v2/banks` and cache for 24h.
Option B: hardcode the top 20 Vietnamese banks as a static JSON file. Banks don't change often. Simpler and no external dependency.

Recommendation: Option B for MVP.

---

## Edge Cases

**Player paid but never tapped "I've paid":**
The booking stays as "pending." Venue owner sees money arrive in their bank with orderId in the description. They can find the booking by orderId in admin and manually update status. Add a search-by-orderId in the admin All Bookings screen for this scenario.

**Player tapped "I've paid" but didn't actually pay:**
Venue owner checks bank, payment not there, taps "Not received." Booking reverts to "pending." Player sees it back as "pending payment" with the QR again. They can pay for real or cancel.

**Player paid wrong amount:**
Venue owner sees transfer but amount doesn't match. They can call the player (phone is on the booking card) to sort it out, then either confirm or reject. The `paymentNote` field can store "Paid 100k instead of 135k" for reference.

**Player paid to wrong account:**
Not possible if they scanned the QR, since bank details are embedded. Only happens with manual transfer and typos. Venue owner taps "Not received," player contacts their bank.

**Venue has no bank details configured:**
If `bankBin`, `bankAccount`, or `bankHolder` is null, the payment screen shows: "This venue hasn't set up online payment yet. Please contact them directly." with venue phone number (tappable to call). Booking still works, just no QR.

**Booking canceled after player paid:**
Player taps cancel on a "payment_submitted" booking. Show warning: "If you already transferred money, you'll need to contact the venue for a refund." with venue phone. Status goes to "canceled," slots freed. Refund is between player and venue directly.

**Multiple bookings, same orderId in bank statement:**
orderId is unique per booking, so each transfer has a distinct description. No collision.

---

## Migration Path

### From current PRD (no payment)

The original PRD has a status "booked" (venue approved, not yet paid). With VietQR, this state is replaced by the payment flow:

| Original Status | New Status | Meaning |
|---|---|---|
| pending | pending | Same: booking created, awaiting action |
| booked | (removed) | No longer needed, payment confirmation replaces approval |
| (new) | payment_submitted | Player says they paid, venue needs to verify |
| paid | paid | Same: confirmed and paid |
| canceled | canceled | Same: canceled by player or venue |

If you've already built with the "booked" status, you can keep it as an alias for "paid" or run a migration to rename. For new builds, skip "booked" entirely.

### Database migration

```bash
npx prisma migrate dev --name add-vietqr-payment
```

Changes:
- Venue: add `bankName`, `bankBin`, `bankAccount`, `bankHolder` (all String, nullable)
- Booking: add `paymentSubmittedAt`, `paymentConfirmedAt` (DateTime, nullable), `paymentNote` (String, nullable)

### Seed update

In `prisma/seed.ts`, add sample bank details to a few venues for testing:
```typescript
{
  bankName: "MB Bank",
  bankBin: "970422",
  bankAccount: "0123456789",
  bankHolder: "NGUYEN VAN TEST",
}
```

---

## Summary of Tap Count: CourtMap vs AloBo

| Step | AloBo | CourtMap |
|---|---|---|
| Select court + time | Multiple screens | 1 screen (availability tab) |
| Submit booking | 1 tap | 1 tap |
| See payment info | Navigate to booking details | Instant (same screen) |
| Open bank app | Manual (copy details) | Scan QR (or tap deeplink) |
| Pay | Fill in details manually | Pre-filled (amount + note) |
| Confirm payment | Screenshot > upload > wait | 1 tap ("I've paid") |
| **Total taps** | **8-12** | **3-4** |
