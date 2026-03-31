#!/usr/bin/env node
/**
 * Export pickleball courts from decrypted alobo data to JSON + CSV
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'output');

const raw = JSON.parse(fs.readFileSync(path.join(OUT, 'decrypted_3.json'), 'utf8'));
const allBranches = raw.branches || [];
console.log(`Total branches in database: ${allBranches.length}`);

const pickleball = allBranches.filter(b => {
  const text = (b.name + ' ' + (b.nameEn || '') + ' ' + (b.address || '')).toLowerCase();
  return text.includes('pickle') || text.includes('pickleball') || b.type === 5;
});

console.log(`Pickleball venues: ${pickleball.length}`);

function formatHours(start, end) {
  if (!start && !end) return '';
  const fmt = h => {
    if (h == null) return '';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

const venues = pickleball.map(b => ({
  id:        b.id,
  name:      b.name,
  name_en:   b.nameEn || '',
  address:   b.address,
  address_en: b.addressEn || '',
  latitude:  b.location?._latitude ?? null,
  longitude: b.location?._longitude ?? null,
  phone:     b.phone || b.phone2 || '',
  hours:     formatHours(b.morningStartWorkingTime, b.afternoonEndWorkingTime),
  rating:    b.totalRating > 0 ? (b.totalStar / b.totalRating).toFixed(1) : '',
  total_ratings: b.totalRating || 0,
  booking_types: (b.bookingTypes || []).join(', '),
  has_voucher: b.hasVoucher ? 'yes' : 'no',
  avatar:    b.avatar || '',
  url:       `https://datlich.alobo.vn/dat-lich/${b.id}`,
  province_id: b.provinceId || '',
  district_id: b.districtId || '',
}));

// JSON
const jsonPath = path.join(OUT, 'pickleball_courts.json');
fs.writeFileSync(jsonPath, JSON.stringify(venues, null, 2));
console.log(`\nSaved: ${jsonPath} (${venues.length} venues)`);

// CSV
const csvHeader = Object.keys(venues[0]).join(',');
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvRows = venues.map(v => Object.values(v).map(esc).join(','));
const csvPath = path.join(OUT, 'pickleball_courts.csv');
fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'));
console.log(`Saved: ${csvPath}`);

// Stats
const withCoords = venues.filter(v => v.latitude && v.longitude);
const withRating = venues.filter(v => v.rating);
console.log(`\n── Stats ──`);
console.log(`  With coordinates: ${withCoords.length} / ${venues.length}`);
console.log(`  With ratings: ${withRating.length}`);
console.log(`  With vouchers: ${venues.filter(v => v.has_voucher === 'yes').length}`);

// Province distribution
const byProvince = {};
for (const v of venues) {
  const p = v.province_id || 'unknown';
  byProvince[p] = (byProvince[p] || 0) + 1;
}
console.log(`  Province distribution (top 10):`);
Object.entries(byProvince)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([p, c]) => console.log(`    Province ${p}: ${c} venues`));
