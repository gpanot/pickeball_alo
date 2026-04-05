import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const SUBDIR = 'court-map-carto-dark';

/**
 * Directory for react-native-maps `UrlTile` disk cache (`tileCachePath`).
 * Tiles load from disk on later visits; new areas still fetch once over the network.
 *
 * @see https://github.com/react-native-maps/react-native-maps/blob/master/docs/tiles.md
 */
export function getMapTileCacheDirectory(): string | null {
  if (Platform.OS === 'web') return null;
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  const normalized = base.endsWith('/') ? base : `${base}/`;
  const full = `${normalized}${SUBDIR}`;
  // Android MapUrlTile forwards the prop to MapTileProvider as a filesystem path; a `file://`
  // prefix breaks `new File(...)` in the native cache writer.
  if (Platform.OS === 'android' && full.startsWith('file://')) {
    return full.slice('file://'.length);
  }
  return full;
}

export async function ensureMapTileCacheDirectory(): Promise<string | null> {
  const dir = getMapTileCacheDirectory();
  if (!dir) return null;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // already exists
  }
  return dir;
}
