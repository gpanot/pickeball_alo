# pickeball_alo

Static pickleball court viewer (Vietnam / AloBo data): map, filters, and pricing from `courts.json`.

## Local

Open `viewer.html` in a browser or serve the folder (fetch needs same-origin or a server for `courts.json`).

## PWA

Installable on mobile/desktop: `manifest.json` + `sw.js` (cache shell and `courts.json` after first load). Served over HTTPS on Vercel.

## Deploy (Vercel)

**Import from GitHub (recommended)**  
[Vercel Dashboard](https://vercel.com/new) → Add New Project → Import `gpanot/pickeball_alo`. Framework: **Other**, root directory **.** , no build command, output **.** (static). `vercel.json` already maps `/` → `viewer.html`.

**CLI** (after `vercel login`): from this repo run `vercel deploy --prod`.

Repo: https://github.com/gpanot/pickeball_alo

## Data

Update `courts.json` at the repo root (e.g. from `scraper/export_for_viewer.js`). Scraper `output/` is gitignored.
