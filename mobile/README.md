# CourtMap — Expo (player app)

React Native Expo client for the CourtMap pickleball booking **player** experience. It calls the same REST API as the Next.js web app (`/api/venues`, `/api/bookings`, etc.).

## Setup

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to your running Next.js server (e.g. `http://localhost:3000` or your deployed URL).

2. Install and run:

```bash
npm install
npx expo start
```

Use **iOS Simulator** or **Android emulator**; for a physical device, use your machine’s LAN IP in `EXPO_PUBLIC_API_BASE_URL` (not `localhost`).

## Native bits

- **Maps**: `react-native-maps` with CARTO raster tiles (same dark/light idea as web).
- **Location**: `expo-location` for “You” and recenter (permissions configured in `app.json`).
- **Fonts**: DM Sans + Archivo Black (Google Fonts via Expo).

## Project layout

- `app/` — Expo Router routes (tabs + `venue/[id]` modal).
- `components/` — UI ported from the web `components/` tree.
- `context/CourtMapContext.tsx` — global state mirroring `CourtMapApp` on web.
- `lib/` — types, API client, formatters, theme (shared logic with the Next app).

Admin remains on the responsive web app; this package is **player-only**.
