#!/usr/bin/env node
/**
 * Query real-time booking data for any venue — no Puppeteer, no login needed.
 * Uses the same x-user-app token generation as scraper.js.
 */

import crypto from 'node:crypto';

const AES_KEY = Buffer.from('Al0b0@Doczy2025_5679_Secret_1107', 'utf8');
const X_USER_SECRET = '3486977e89f9031fb0ffe429b6dd252f';
const API_BASE = 'https://user-global.alobo.vn';
const SITE = 'https://datlich.alobo.vn';

function generateXUserApp(date = new Date()) {
  const pad2 = n => String(n).padStart(2, '0');
  const formatted = `${pad2(date.getUTCMonth() + 1)}/${pad2(date.getUTCDate())}/${date.getUTCFullYear()}, ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
  return crypto.createHash('sha256').update(Buffer.from(`${formatted}@${X_USER_SECRET}`, 'utf8')).digest('hex');
}

function headers() {
  return {
    'x-user-app': generateXUserApp(),
    'origin': SITE,
    'referer': `${SITE}/`,
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };
}

function decrypt(ivB64, dataB64) {
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(dataB64, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

async function apiGet(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, { headers: headers() });
  const json = await res.json();
  if (json.enc === true && json.data && json.iv) {
    return JSON.parse(decrypt(json.iv, json.data));
  }
  if (json.message) throw new Error(`API error: ${json.message}`);
  return json;
}

const VENUE_ID = process.argv[2] || 'sport_65th_street_pickleball';
const DATE = process.argv[3] || new Date().toISOString().split('T')[0];
const MONTH = DATE.slice(0, 7);

async function main() {
  console.log(`Querying bookings for: ${VENUE_ID}`);
  console.log(`Date: ${DATE} | Month: ${MONTH}\n`);

  // 1. Venue info
  const branch = await apiGet(`/v2/user/branch/get_branch/${VENUE_ID}`);
  console.log(`Venue: ${branch.name}`);
  console.log(`Hours: ${branch.morningStartWorkingTime || 6}:00 - ${branch.afternoonEndWorkingTime || 22}:00\n`);

  // 2. Courts
  const { cores } = await apiGet(`/v2/user/branch/get_cores/${VENUE_ID}`);
  console.log(`Courts: ${cores.map(c => c.name).join(', ')}\n`);

  // 3. One-time bookings (the red "Booked" slots)
  const bookings = await apiGet(`/v2/user/branch/get_onetime_bookings?branchId=${VENUE_ID}&startDate=${DATE}&endDate=${DATE}`);
  console.log(`=== Booked slots for ${DATE}: ${bookings.length} ===`);
  for (const b of bookings) {
    for (const s of b.services) {
      const court = cores.find(c => c.id === s.serviceId)?.name || s.serviceId;
      const start = s.startTime.split('T')[1].slice(0, 5);
      const endTime = new Date(new Date(s.startTime).getTime() + s.duration * 60000);
      const end = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
      console.log(`  ${court}: ${start} - ${end} (${s.duration}min)`);
    }
  }

  // 4. Schedule bookings (recurring)
  const schedule = await apiGet(`/v2/user/branch/get_schedule_bookings?branchId=${VENUE_ID}&month=${MONTH}`);
  console.log(`\n=== Schedule bookings for ${MONTH}: ${schedule.length} ===`);
  for (const b of schedule) {
    for (const s of b.services || []) {
      const court = cores.find(c => c.id === s.serviceId)?.name || s.serviceId;
      console.log(`  ${court}: ${s.startTime?.split('T')[1]?.slice(0, 5)} (${s.duration}min) - recurring`);
    }
  }

  // 5. Locked yards
  const locks = await apiGet(`/v2/user/branch/get_lock_yards/${VENUE_ID}`);
  const todayLocks = locks.filter(l => l.startTime.startsWith(DATE));
  console.log(`\n=== Locked slots for ${DATE}: ${todayLocks.length} ===`);
  for (const l of todayLocks) {
    const courtNames = l.servicesId.map(id => cores.find(c => c.id === id)?.name || id).join(', ');
    const start = l.startTime.split('T')[1].slice(0, 5);
    const end = l.endTime.split('T')[1].slice(0, 5);
    console.log(`  ${courtNames}: ${start} - ${end}${l.note ? ` (${l.note})` : ''}`);
  }

  console.log('\nDone!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
