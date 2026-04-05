# pickeball_alo

Pickleball court viewer (Vietnam / AloBo data): map, booking-style filters, and pricing from static `courts.json`.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Leaflet** map (client-only bundle via `next/dynamic` + `ssr: false`)
- Domain logic in `lib/` (`filterVenues`, geo, hours, pricing helpers)

### Mobile player app (Expo)

The **player** UI is also available as a React Native app under [`mobile/`](mobile/). It uses the same `/api/*` backend; set `EXPO_PUBLIC_API_BASE_URL` (see `mobile/.env.example`). Admin stays on the web app.

## Local

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Production database (why the app shows no venues)

Search and the map load venues from **PostgreSQL** through Prisma (`/api/venues`). A successful `npm run build` / `next start` does **not** load venue rows by itself.

Do this **once per environment** (or after you create a new database), with `DATABASE_URL` pointing at that Postgres:

```bash
# 1. Apply schema (creates tables)
npm run db:deploy

# 2. Import venues + slots from public/courts.json (wipes and repopulates venue-related tables)
npm run db:seed
```

`prisma/seed.ts` reads **`public/courts.json`** (it must exist in the deploy artifact—commit it or copy it onto the server). If you set `SEED_RADIUS_KM` when seeding, only venues within that radius of HCMC are imported; if it is too small, you can end up with **zero** venues.

On **Vercel**, run the two commands locally against the production `DATABASE_URL`, or add a release / one-off job that runs them. You can also set the build command to `prisma migrate deploy && npm run build` so migrations apply on each deploy (still run **`db:seed` manually** when the DB is empty—do not add seed to every build unless you intend to reset data each time).

## PWA

`public/manifest.json` + `public/sw.js` cache the app shell and `courts.json` after first load. Served over HTTPS on Vercel.

## Deploy (Vercel)

Import the repo and use the **Next.js** preset (default build: `next build`, output: `.next`). No custom rewrite is required; `/` is the app.

`vercel.json` sets `"framework": "nextjs"` so the project is not treated as a static export.

### If you see `404: NOT_FOUND` after a successful build

In the Vercel project **Settings → General → Build & Development**:

- **Framework Preset:** Next.js
- **Root Directory:** `.` (or leave empty), unless the app lives in a subfolder
- **Build Command:** default (`next build`) or leave empty
- **Output Directory:** **leave empty** — do not set `public`, `.`, or `out` unless you use `output: 'export'`. An old “static site” Output Directory is the most common cause of 404.

Redeploy after changing settings.

## Data

Canonical file for the running app: **`public/courts.json`**.

Regenerate from the scraper:

```bash
node scraper/export_for_viewer.js
```

That script writes `scraper/output/courts.json` and, when `public/` exists, also **`public/courts.json`**.

## Repo layout

- `app/` — `layout.tsx`, `page.tsx`, `globals.css` (ported from the old single-page viewer)
- `components/` — `CourtMapLoader` (dynamic import), `CourtMapShell` (UI + map)
- `lib/` — types, filtering, geo, hours, slots
- `mobile/` — Expo Router app (player-only); see `mobile/README.md`
- `public/` — `courts.json`, `manifest.json`, `icons/`, `sw.js`

Legacy **`viewer.html`** has been removed in favor of the Next app.
