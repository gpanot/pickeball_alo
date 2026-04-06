#!/usr/bin/env node
/**
 * Alobo.vn Pickleball Court Scraper
 *
 * Calls the alobo API directly with proper auth + AES decryption.
 * No browser needed — all keys reverse-engineered from main.dart.js.
 */

import crypto from 'node:crypto';
import fs    from 'node:fs';
import path  from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Deobfuscated keys ──────────────────────────────────────────────────────

const AES_KEY_STR    = 'Al0b0@Doczy2025_5679_Secret_1107';   // 32 bytes → AES-256
const AES_KEY_BUF    = Buffer.from(AES_KEY_STR, 'utf8');
const X_USER_SECRET  = '3486977e89f9031fb0ffe429b6dd252f';

const API_BASE = 'https://user-global.alobo.vn';
const SITE     = 'https://datlich.alobo.vn';

// ── Auth header generation ─────────────────────────────────────────────────

function generateXUserApp(date = new Date()) {
  const pad2 = n => String(n).padStart(2, '0');
  const formatted = `${pad2(date.getUTCMonth() + 1)}/${pad2(date.getUTCDate())}/${date.getUTCFullYear()}, ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
  const input = `${formatted}@${X_USER_SECRET}`;
  return crypto.createHash('sha256').update(Buffer.from(input, 'utf8')).digest('hex');
}

function headers() {
  return {
    'x-user-app':   generateXUserApp(),
    'origin':       SITE,
    'referer':      `${SITE}/`,
    'content-type': 'application/json',
    'user-agent':   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
}

// ── AES-256-CBC decryption ─────────────────────────────────────────────────

function decrypt(ivB64, dataB64) {
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY_BUF, iv);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

function encryptBody(payload) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY_BUF, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    enc: true,
    data: ct.toString('base64'),
    iv: iv.toString('base64'),
  };
}

// ── API helpers ────────────────────────────────────────────────────────────

function log(tag, ...args) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}][${tag}]`, ...args);
}

async function apiGet(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  log('API', `GET ${url}`);
  const res = await fetch(url, { headers: headers() });
  const json = await res.json();
  if (json.enc === true && json.data && json.iv) {
    const plain = decrypt(json.iv, json.data);
    return JSON.parse(plain);
  }
  return json;
}

async function apiPost(endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  log('API', `POST ${url}`);
  const encrypted = encryptBody(body);
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(encrypted),
  });
  const json = await res.json();
  if (json.enc === true && json.data && json.iv) {
    const plain = decrypt(json.iv, json.data);
    return JSON.parse(plain);
  }
  return json;
}

// ── Venue scraping ─────────────────────────────────────────────────────────

async function fetchBranches() {
  log('SCRAPE', 'Fetching branch list …');
  try {
    const data = await apiGet('/v2/user/branch/get_quick_search');
    log('SCRAPE', `get_quick_search returned: ${JSON.stringify(data).slice(0, 300)}`);
    return data;
  } catch (e) {
    log('SCRAPE', `get_quick_search failed: ${e.message}`);
  }

  try {
    const data = await apiGet('/v2/user/branch/branches?lastFetchBranch=0');
    log('SCRAPE', `branches returned: ${JSON.stringify(data).slice(0, 300)}`);
    return data;
  } catch (e) {
    log('SCRAPE', `branches failed: ${e.message}`);
  }

  return null;
}

function extractVenues(data, depth = 0) {
  if (depth > 8 || !data) return [];
  const out = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (looksLikeVenue(item)) out.push(item);
      else out.push(...extractVenues(item, depth + 1));
    }
  } else if (typeof data === 'object') {
    if (looksLikeVenue(data)) return [data];
    for (const v of Object.values(data)) {
      out.push(...extractVenues(v, depth + 1));
    }
  }
  return out;
}

function looksLikeVenue(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = new Set(Object.keys(obj));
  const signals = [
    'name', 'address', 'dia_chi', 'full_address', 'slug',
    'open_time', 'phone', 'sport_type', 'branch_name',
    'latitude', 'longitude', 'lat', 'lng',
  ];
  return signals.filter(k => keys.has(k)).length >= 2;
}

function normalizeVenue(raw) {
  const name = raw.name || raw.branch_name || raw.title || raw.ten || '';
  const slug = raw.slug || raw.alias || '';
  return {
    name,
    address:   raw.address || raw.dia_chi || raw.full_address || raw.location || '',
    slug,
    url:       raw.url || (slug ? `${SITE}/dat-lich/${slug}` : ''),
    latitude:  raw.latitude ?? raw.lat ?? null,
    longitude: raw.longitude ?? raw.lng ?? null,
    phone:     raw.phone || '',
    open_time: raw.open_time || raw.opening_hours || '',
    close_time: raw.close_time || '',
    sport_types: [].concat(raw.sport_type || [], raw.sports || []).flat().filter(Boolean),
    rating:    raw.rating ?? raw.avg_rating ?? null,
    id:        raw.id || raw.branch_id || raw._id || '',
  };
}

async function fetchVenueDetail(venueId) {
  const endpoints = [
    `/v2/user/branch/${venueId}`,
    `/v2/user/branch/detail/${venueId}`,
    `/v2/user/branch/get_branch_detail?branchId=${venueId}`,
  ];
  for (const ep of endpoints) {
    try {
      const data = await apiGet(ep);
      if (data && !data.message) return data;
    } catch { /* try next */ }
  }
  return null;
}

async function fetchServicePricing(venueId) {
  const endpoints = [
    `/v2/user/service/get_by_branch?branchId=${venueId}`,
    `/v2/user/service/${venueId}`,
    `/v2/user/branch/services?branchId=${venueId}`,
    `/v2/user/price/get_by_branch?branchId=${venueId}`,
  ];
  for (const ep of endpoints) {
    try {
      const data = await apiGet(ep);
      if (data && !data.message) {
        log('PRICE', `Found pricing via ${ep}`);
        return data;
      }
    } catch { /* try next */ }
  }
  return null;
}

// ── Export ──────────────────────────────────────────────────────────────────

function exportJSON(venues, filename = 'courts.json') {
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(venues, null, 2));
  log('EXPORT', `${venues.length} venues → ${outPath}`);
}

function exportCSV(venues, filename = 'courts.csv') {
  const esc = s => `"${String(s || '').replace(/"/g, '""')}"`;
  const csvHeader = 'name,address,latitude,longitude,phone,open_time,close_time,sport_types,rating,url,id';
  const rows = venues.map(v => [
    esc(v.name), esc(v.address), v.latitude ?? '', v.longitude ?? '',
    esc(v.phone), esc(v.open_time), esc(v.close_time),
    esc(v.sport_types?.join(', ')), v.rating ?? '', esc(v.url), esc(v.id),
  ].join(','));
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, [csvHeader, ...rows].join('\n'));
  log('EXPORT', `${venues.length} venues → ${outPath}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('MAIN', 'Starting Alobo Pickleball Court Scraper');
  log('MAIN', `x-user-app: ${generateXUserApp()}`);

  // 1. Fetch the main branch/venue list
  const raw = await fetchBranches();
  if (!raw) {
    log('MAIN', 'Could not fetch any data from the API. Exiting.');
    process.exit(1);
  }

  // Save raw response for debugging
  fs.writeFileSync(path.join(OUT_DIR, 'raw_branches.json'), JSON.stringify(raw, null, 2));
  log('MAIN', `Raw response saved to output/raw_branches.json`);

  // 2. Extract venues
  const venueList = extractVenues(raw);
  log('MAIN', `Extracted ${venueList.length} venues`);

  if (venueList.length === 0) {
    log('MAIN', 'No venues found in the response. Dumping keys for inspection:');
    if (typeof raw === 'object') {
      const topKeys = Object.keys(raw).slice(0, 20);
      log('MAIN', `Top-level keys: ${topKeys.join(', ')}`);
      for (const k of topKeys) {
        const v = raw[k];
        log('MAIN', `  ${k}: ${Array.isArray(v) ? `Array[${v.length}]` : typeof v}`);
      }
    }
  }

  // 3. Normalize
  const venues = venueList.map(normalizeVenue);

  // 4. Filter pickleball if we can
  const pickleballVenues = venues.filter(v => {
    const text = JSON.stringify(v).toLowerCase();
    return text.includes('pickle') || text.includes('pickleball');
  });

  log('MAIN', `Pickleball venues: ${pickleballVenues.length} / ${venues.length} total`);

  // 5. Try to fetch pricing for each pickleball venue (or all if few)
  const targetVenues = pickleballVenues.length > 0 ? pickleballVenues : venues.slice(0, 30);
  log('MAIN', `Fetching details for ${targetVenues.length} venues …`);

  for (let i = 0; i < targetVenues.length; i++) {
    const v = targetVenues[i];
    const venueId = v.id || v.slug;
    if (!venueId) continue;

    log('DETAIL', `[${i + 1}/${targetVenues.length}] ${v.name} (${venueId})`);

    const detail = await fetchVenueDetail(venueId);
    if (detail) {
      v.detail = detail;
      fs.writeFileSync(path.join(OUT_DIR, `detail_${venueId}.json`), JSON.stringify(detail, null, 2));
    }

    const pricing = await fetchServicePricing(venueId);
    if (pricing) {
      v.pricing = pricing;
      fs.writeFileSync(path.join(OUT_DIR, `pricing_${venueId}.json`), JSON.stringify(pricing, null, 2));
    }

    // Respect rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  // 6. Export
  exportJSON(venues, 'all_courts.json');
  exportCSV(venues, 'all_courts.csv');

  if (pickleballVenues.length > 0) {
    exportJSON(pickleballVenues, 'pickleball_courts.json');
    exportCSV(pickleballVenues, 'pickleball_courts.csv');
  }

  log('MAIN', 'Done!');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
