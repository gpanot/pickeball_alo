export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const DISTRICT_COORDS: Record<string, [number, number]> = {
  'tân phú': [10.788, 106.628],
  'tan phu': [10.788, 106.628],
  'bình thạnh': [10.812, 106.712],
  'binh thanh': [10.812, 106.712],
  'quận 1': [10.776, 106.702],
  'district 1': [10.776, 106.702],
  'quận 2': [10.786, 106.742],
  'thủ đức': [10.85, 106.757],
  'quận 3': [10.779, 106.69],
  'quận 4': [10.76, 106.702],
  'quận 5': [10.754, 106.672],
  'quận 6': [10.748, 106.638],
  'quận 7': [10.73, 106.718],
  'phú nhuận': [10.8, 106.685],
  'quận 10': [10.773, 106.668],
  'quận 11': [10.763, 106.651],
  'quận 12': [10.868, 106.654],
  'gò vấp': [10.838, 106.673],
  'bình dương': [10.97, 106.65],
  'đồng nai': [10.95, 107.0],
  'hà nội': [21.028, 105.834],
  'ha noi': [21.028, 105.834],
  'đà nẵng': [16.054, 108.202],
  'da nang': [16.054, 108.202],
};

export function guessCoords(address: string | undefined): [number, number] | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
    if (lower.includes(key)) {
      return [
        coords[0] + (Math.random() - 0.5) * 0.005,
        coords[1] + (Math.random() - 0.5) * 0.005,
      ];
    }
  }
  return null;
}
