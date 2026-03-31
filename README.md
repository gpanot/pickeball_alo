# pickeball_alo

Static pickleball court viewer (Vietnam / AloBo data): map, filters, and pricing from `courts.json`.

## Local

Open `viewer.html` in a browser or serve the folder (fetch needs same-origin or a server for `courts.json`).

## Deploy (Vercel)

Connected repo deploys automatically. Production URL is shown in the Vercel dashboard.

Root `/` rewrites to `viewer.html`.

## Data

Update `courts.json` at the repo root (e.g. from `scraper/export_for_viewer.js`). Scraper `output/` is gitignored.
