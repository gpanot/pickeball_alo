/**
 * Point the app at your Next.js CourtMap deployment (same origin as /api/*).
 * Set EXPO_PUBLIC_API_BASE_URL in .env or app.config extra.
 *
 * In dev, `localhost` is rewritten so physical devices and the Android emulator
 * reach the machine running Metro/Next (Expo `hostUri` → LAN IP; Android
 * emulator → 10.0.2.2).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

const rawBaseUrl =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  extra.apiBaseUrl ||
  'http://localhost:3000';

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}

/** Metro / Expo dev URIs often carry the LAN host before hostUri is populated (e.g. some Android builds). */
function extractLanHost(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  try {
    if (s.startsWith('exp://') || s.startsWith('exps://')) {
      const rest = s.replace(/^exps?:\/\//, '');
      const host = rest.split(':')[0]?.split('/')[0];
      return host && host !== 'localhost' && host !== '127.0.0.1' ? host : undefined;
    }
    if (s.includes('://')) {
      const host = new URL(s).hostname;
      return host && host !== 'localhost' && host !== '127.0.0.1' ? host : undefined;
    }
    const host = s.split(':')[0];
    return host && host !== 'localhost' && host !== '127.0.0.1' ? host : undefined;
  } catch {
    return undefined;
  }
}

function devPackagerLanHost(): string | undefined {
  const candidates: string[] = [];
  const ec = Constants.expoConfig as { hostUri?: string } | null;
  if (ec?.hostUri) candidates.push(ec.hostUri);
  const go = Constants.expoGoConfig as { debuggerHost?: string } | null;
  if (go?.debuggerHost) candidates.push(go.debuggerHost);
  const legacy = Constants.manifest as { hostUri?: string; debuggerHost?: string } | null;
  if (legacy?.hostUri) candidates.push(legacy.hostUri);
  if (legacy?.debuggerHost) candidates.push(legacy.debuggerHost);
  if (Constants.experienceUrl) candidates.push(Constants.experienceUrl);
  if (Constants.linkingUri) candidates.push(Constants.linkingUri);

  for (const c of candidates) {
    const h = extractLanHost(c);
    if (h) return h;
  }
  return undefined;
}

function resolveLoopbackForNativeDev(configured: string): string {
  let url: URL;
  try {
    url = new URL(configured.trim());
  } catch {
    return configured;
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!loopback) return configured;

  const machineHost =
    devPackagerLanHost() ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  url.hostname = machineHost;
  return url.toString().replace(/\/$/, '');
}

function baseUrlUsesLoopback(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

const resolved =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  Platform.OS !== 'web' &&
  baseUrlUsesLoopback(rawBaseUrl)
    ? resolveLoopbackForNativeDev(rawBaseUrl)
    : rawBaseUrl;

export const API_BASE_URL = stripTrailingSlash(resolved);
