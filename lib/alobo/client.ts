/**
 * AloBo API client — token generation, AES-256-CBC decryption, fetch wrapper.
 * Isolated module: safe to delete without affecting the rest of the app.
 */
import * as crypto from 'node:crypto';

const AES_KEY = Buffer.from('Al0b0@Doczy2025_5679_Secret_1107', 'utf8');
const X_USER_SECRET = '3486977e89f9031fb0ffe429b6dd252f';
const API_BASE = 'https://user-global.alobo.vn';
const SITE = 'https://datlich.alobo.vn';

function generateToken(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = `${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}/${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  return crypto
    .createHash('sha256')
    .update(Buffer.from(`${formatted}@${X_USER_SECRET}`, 'utf8'))
    .digest('hex');
}

function headers(): Record<string, string> {
  return {
    'x-user-app': generateToken(),
    origin: SITE,
    referer: `${SITE}/`,
  };
}

function decrypt(ivB64: string, dataB64: string): string {
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

interface EncResponse {
  enc?: boolean;
  iv?: string;
  data?: string;
  message?: string;
}

export async function aloboGet<T = unknown>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, { headers: headers() });
  const json: EncResponse = await res.json();
  if (json.enc === true && json.iv && json.data) {
    return JSON.parse(decrypt(json.iv, json.data)) as T;
  }
  if (json.message) {
    throw new Error(`AloBo API error: ${json.message}`);
  }
  return json as T;
}

// ── AloBo response types ──────────────────────────────────────────────

export interface AloboBookingService {
  serviceId: string;
  startTime: string;
  duration: number;
  price: number;
  amount: number;
  branchServiceType: string;
}

export interface AloboBooking {
  id: string;
  time: string;
  duration: number;
  services: AloboBookingService[];
  type: string;
  totalPrice: number;
  status: number;
}

export interface AloboLockedYard {
  servicesId: string[];
  startTime: string;
  endTime: string;
  note?: string;
}

export async function fetchOnetimeBookings(
  aloboSlug: string,
  date: string,
): Promise<AloboBooking[]> {
  return aloboGet<AloboBooking[]>(
    `/v2/user/branch/get_onetime_bookings?branchId=${aloboSlug}&startDate=${date}&endDate=${date}`,
  );
}

export async function fetchScheduleBookings(
  aloboSlug: string,
  month: string,
): Promise<AloboBooking[]> {
  return aloboGet<AloboBooking[]>(
    `/v2/user/branch/get_schedule_bookings?branchId=${aloboSlug}&month=${month}`,
  );
}

export async function fetchLockedYards(
  aloboSlug: string,
): Promise<AloboLockedYard[]> {
  return aloboGet<AloboLockedYard[]>(
    `/v2/user/branch/get_lock_yards/${aloboSlug}`,
  );
}
