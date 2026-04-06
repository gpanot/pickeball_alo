# Alobo Scraping Log

## Source

- **URL**: https://datlich.alobo.vn/
- **Platform**: Flutter Web (canvas-based rendering, AES-CBC encrypted API responses)
- **Method**: Puppeteer + Chrome DevTools Protocol for live `x-user-app` header capture, then `page.evaluate(fetch(...))` to call API endpoints directly, with AES-256-CBC decryption of responses.

---

## Scrape #1 — Branch List

- **Date**: 2026-03-29
- **Endpoint**: `GET /v2/user/branch/branches_first`, `GET /v2/user/branch/branches`
- **Output**: `scraper/output/decrypted_3.json`
- **Records**: 1,976 pickleball venues (filtered from full branch list)
- **Fields per venue**: `id`, `name`, `nameEn`, `address`, `phone`, `location` (lat/lng), `type`, `totalStar`, `totalRating`, `hasVoucher`, `morningStartWorkingTime`, `afternoonEndWorkingTime`, `provinceId`, `districtId`, `wardId`

---

## Scrape #2 — Pricing & Venue Details

- **Date**: 2026-03-30
- **Endpoints per venue**:
  - `GET /v2/user/branch/get_core_types/{venueId}` — pricing tables (time bands, walk-in/member rates)
  - `GET /v2/user/branch/get_branch/{venueId}` — full venue detail (phone, location, payment settings)
- **Output**: `scraper/output/pricing_all.json` (first run, 2 endpoints)
- **Records**: 1,976 venues, 0 errors
- **Fields extracted**:
  - **Pricing**: `specialPrice[]` with `time`, `price`, `priceOneTime`, `dateRangeWeek`; `normalPrice`, `normalPriceOneTime` for defaults
  - **Branch detail**: `phone`, `location._latitude/_longitude`, `morningStartWorkingTime`, `afternoonEndWorkingTime`, `paymentImage`, `notePayment`, `depositOneTime`

---

## Scrape #3 — Pricing + Courts + Payments (full)

- **Date**: 2026-04-01
- **Endpoints per venue** (4 total):
  - `GET /v2/user/branch/get_core_types/{venueId}` — pricing tables
  - `GET /v2/user/branch/get_branch/{venueId}` — venue details
  - `GET /v2/user/branch/get_cores/{venueId}` — individual courts list
  - `GET /v2/user/branch/get_payments/{venueId}` — bank/payment info
- **Output**: `scraper/output/pricing_all.json` (overwritten with 4 endpoints)
- **Records**: 1,976 venues, 0 errors
- **Duration**: ~2h 8min
- **Stats**:
  - With pricing data: 1,971
  - With court listings: 1,972 (10,581 total individual courts)
  - With bank/payment info: 1,899
  - With GPS coordinates: 1,944
- **New fields extracted**:
  - **Courts** (`get_cores`): `cores[]` with `name`, `id`, `shortName`, `status`, `unit`, `type`, `setting`, `priority`, `yardType`
  - **Payments** (`get_payments`): `accountName`, `accountNumber`, `bank`, `qr` (Firebase Storage URL), `title`, `titleEn`

---

## Exported Viewer Data

- **Date**: 2026-04-01
- **Script**: `scraper/export_for_viewer.js`
- **Output**: `scraper/output/courts.json` + `public/courts.json`
- **Format**: JSON array, one object per venue with:
  - `name`, `address`, `url`, `latitude`, `longitude`, `phone`, `hours`
  - `rating`, `ratingCount`, `hasVoucher`
  - `courtCount`, `courts[]` (id, name, status)
  - `pricing_tables[]`, `pricing_table_names[]`
  - `payments[]` (bank, accountName, accountNumber, qr)
  - `promotions[]`, `flat_prices[]`

---

## Real-Time Booking Data (Discovery)

- **Date**: 2026-04-06
- **Method**: Navigated Flutter app via Puppeteer with accessibility mode enabled to capture network traffic on the "Visual Day Booking" page. Identified two key endpoints for live booking data. No login or account required — all data is publicly accessible as a guest.
- **Endpoints discovered**:
  - `GET /v2/user/branch/get_onetime_bookings?branchId={venueId}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — one-time (ad-hoc) booked slots
  - `GET /v2/user/branch/get_schedule_bookings?branchId={venueId}&month=YYYY-MM` — recurring/scheduled bookings
  - `GET /v2/user/branch/get_lock_yards/{venueId}` — owner-locked time slots (maintenance, events, etc.)
- **Fields per booking** (`get_onetime_bookings`):
  - `id`, `time`, `duration`, `type` (`groupOneTime`), `totalPrice`, `status`
  - `services[]`: `serviceId` (court ID), `startTime`, `duration`, `price`, `amount`, `branchServiceType`
- **Fields per schedule booking** (`get_schedule_bookings`):
  - Same structure as one-time, with recurring schedule info
- **Fields per locked slot** (`get_lock_yards`):
  - `servicesId[]` (court IDs), `startTime`, `endTime`, `note`
- **Script**: `scraper/query_bookings.js` — standalone query tool, no Puppeteer needed
- **Usage**: `node scraper/query_bookings.js <venueId> [YYYY-MM-DD]`
- **Sample output** (65th Street PICKLEBALL, 2026-04-06):
  - 15 booked slots across 3 courts (Sân 1, Sân 2, Sân 3)
  - 1 locked slot (all courts 06:00–07:00)
  - 0 recurring schedule bookings

---

## Technical Notes

- **AES key**: `Al0b0@Doczy2025_5679_Secret_1107` (32-byte, UTF-8)
- **`x-user-app` header**: `SHA256(MM/DD/YYYY, HH:MM@secret)` where the timestamp is in **UTC** (not local time). Expires ~1 minute. Can be generated locally without a browser — no Puppeteer needed.
- **`x-user-app` secret**: `3486977e89f9031fb0ffe429b6dd252f` (extracted from obfuscated `main.dart.js` via XOR + prime-index permutation decoding)
- **Critical bug fix (2026-04-06)**: The original `generateXUserApp()` used local time (`getHours()`, `getMonth()`), but the Flutter app and server both use **UTC** (`getUTCHours()`, `getUTCMonth()`). Fixed in both `scraper.js` and `query_bookings.js`.
- **Rate limiting**: None observed. Batches of 5 venues at a time with no delays needed.
- **Authentication**: No login or user account required. All venue data, pricing, courts, and real-time bookings are accessible as a guest with only the `x-user-app` header.
- **Navigation path to Visual Day Booking** (for reference): Home → venue page → "Đặt lịch" (Book) button → "Đặt lịch ngày trực quan" (Visual day booking) popup option.

---

## All Known Endpoints

| Endpoint | Method | Params | Data |
|---|---|---|---|
| `/v2/user/branch/branches_first` | GET | — | First batch of venues |
| `/v2/user/branch/branches` | GET | — | All venues |
| `/v2/user/branch/get_branch/{venueId}` | GET | path | Venue details |
| `/v2/user/branch/get_core_types/{venueId}` | GET | path | Pricing tables |
| `/v2/user/branch/get_cores/{venueId}` | GET | path | Court list |
| `/v2/user/branch/get_payments/{venueId}` | GET | path | Bank/payment info |
| `/v2/user/branch/get_lock_yards/{venueId}` | GET | path | Locked time slots |
| `/v2/user/branch/get_onetime_bookings` | GET | query: `branchId`, `startDate`, `endDate` | One-time booked slots |
| `/v2/user/branch/get_schedule_bookings` | GET | query: `branchId`, `month` | Recurring bookings |
