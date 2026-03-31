# pickeball_alo

Pickleball court viewer (Vietnam / AloBo data): map, booking-style filters, and pricing from static `courts.json`.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Leaflet** map (client-only bundle via `next/dynamic` + `ssr: false`)
- Domain logic in `lib/` (`filterVenues`, geo, hours, pricing helpers)

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

## PWA

`public/manifest.json` + `public/sw.js` cache the app shell and `courts.json` after first load. Served over HTTPS on Vercel.

## Deploy (Vercel)

Import the repo and use the **Next.js** preset (default build: `next build`, output: `.next`). No custom rewrite is required; `/` is the app.

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
- `public/` — `courts.json`, `manifest.json`, `icons/`, `sw.js`

Legacy **`viewer.html`** has been removed in favor of the Next app.
