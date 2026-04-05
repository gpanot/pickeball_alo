/**
 * Map / explore timing logs (development only).
 *
 * Where to read them:
 * - Expo CLI / Metro terminal (same window as `npx expo start`)
 * - Android: `adb logcat *:S ReactNative:V ReactNativeJS:V`
 * - Xcode console when running on iOS Simulator
 *
 * Disable: set EXPO_PUBLIC_MAP_DEBUG=0 in mobile/.env
 */
const enabled =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  (typeof process === 'undefined' || process.env?.EXPO_PUBLIC_MAP_DEBUG !== '0');

export function mapDebug(tag: string, payload?: Record<string, unknown>): void {
  if (!enabled) return;
  const line = payload ? `[CourtMap:map] ${tag} ${JSON.stringify(payload)}` : `[CourtMap:map] ${tag}`;
  console.log(line);
}
