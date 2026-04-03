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

## Technical Notes

- **AES key**: `Al0b0@Doczy2025_5679_Secret_1107` (32-byte, UTF-8)
- **`x-user-app` header**: SHA256 hash derived from timestamp, expires ~1 minute. Captured from Flutter app's own network calls and refreshed every 25s.
- **Rate limiting**: None observed. Batches of 5 venues at a time with no delays needed.
- **Token refresh**: Page reload triggers Flutter to re-issue API calls, from which a fresh `x-user-app` is captured via CDP `Network.requestWillBeSent`.
