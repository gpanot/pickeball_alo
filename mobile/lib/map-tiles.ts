/**
 * CARTO dark basemap — same style as the web PWA (`components/screens/MapScreen.tsx`).
 * Leaflet uses `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` with
 * subdomains a–d and a retina suffix; react-native-maps UrlTile only substitutes
 * `{z}`, `{x}`, `{y}`, so we pin shard `a` (identical tile set, one host).
 */
export const CARTO_DARK_ALL_TILE_URL =
  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

/**
 * Default OSM raster endpoint (same `{z}/{x}/{y}` pattern as UrlTile expects).
 * OSMF asks heavy apps to use a commercial host or self-hosted tiles instead of
 * `tile.openstreetmap.org` — see https://operations.osmfoundation.org/policies/tiles/
 */
export const OSM_DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
