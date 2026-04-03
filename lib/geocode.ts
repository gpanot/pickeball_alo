/**
 * Google Maps Geocoding API. Requires GOOGLE_MAPS_API_KEY env var.
 * Returns null on failure (missing key, no results, network error).
 */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const q = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${key}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const loc = data.results[0].geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}
