#!/usr/bin/env node
/**
 * Transform Alobo API data (pricing_all.json + decrypted_3.json) into the
 * viewer-compatible JSON format with proper pricing tables.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'output');

function dayLabel(dr) {
  if (!dr) return 'All week';
  if (dr === '1-7') return 'Mon-Sun';
  if (dr === '1-5') return 'Mon-Fri';
  if (dr === '6-7') return 'Sat-Sun';
  const names = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 7:'Sun' };
  const [a, b] = dr.split('-');
  return `${names[a] || a}-${names[b] || b}`;
}

function fmtPrice(p) {
  if (p == null) return '—';
  return Number(p).toLocaleString('vi-VN') + 'đ';
}

function fmtTime(t) {
  return t.replace(/:00/g, 'h').replace(/(\d+):(\d+)/g, '$1h$2');
}

function buildPricingTables(coreTypes) {
  if (!Array.isArray(coreTypes) || coreTypes.length === 0) return [];

  const tables = [];

  for (const core of coreTypes) {
    if (!core.targets) continue;

    for (const t of Object.values(core.targets)) {
      if (t.hide) continue;

      const slots = t.specialPrice || [];
      const hasGuest = slots.some(sp => sp.priceOneTime != null && sp.priceOneTime !== sp.price);

      const tableName = core.name !== t.name ? `${core.name} — ${t.name}` : core.name;
      const header = hasGuest
        ? ['Day', 'Time', 'Regular', 'Guest']
        : ['Day', 'Time', 'Price'];

      const rows = [header];

      if (slots.length === 0) {
        if (hasGuest) {
          rows.push(['All week', 'All day', fmtPrice(t.price), fmtPrice(t.priceOneTime)]);
        } else {
          rows.push(['All week', 'All day', fmtPrice(t.price)]);
        }
      } else {
        const groups = {};
        for (const sp of slots) {
          const dk = sp.dateRangeWeek || '1-7';
          if (!groups[dk]) groups[dk] = [];
          groups[dk].push(sp);
        }

        for (const [drw, daySlots] of Object.entries(groups)) {
          const dl = dayLabel(drw);
          for (let i = 0; i < daySlots.length; i++) {
            const sp = daySlots[i];
            const dayCell = i === 0 ? dl : '';
            const timeCell = fmtTime(sp.time);
            if (hasGuest) {
              const guest = sp.priceOneTime != null ? sp.priceOneTime : sp.price;
              rows.push([dayCell, timeCell, fmtPrice(sp.price), fmtPrice(guest)]);
            } else {
              rows.push([dayCell, timeCell, fmtPrice(sp.price)]);
            }
          }
        }
      }

      tables.push({ tableName, rows });
    }
  }

  return tables;
}

function main() {
  const pricingData = JSON.parse(fs.readFileSync(path.join(OUT, 'pricing_all.json'), 'utf8'));
  const branchList = JSON.parse(fs.readFileSync(path.join(OUT, 'decrypted_3.json'), 'utf8')).branches;
  const branchMap = {};
  for (const b of branchList) branchMap[b.id] = b;

  const venues = [];

  for (const [id, data] of Object.entries(pricingData)) {
    const branch = branchMap[id] || {};
    const gb = data.get_branch || {};
    const ct = data.get_core_types;

    const lat = gb.location?._latitude || branch.location?.latitude || branch.location?._latitude;
    const lng = gb.location?._longitude || branch.location?.longitude || branch.location?._longitude;

    const tables = buildPricingTables(ct);

    const hours = [];
    const mStart = gb.morningStartWorkingTime ?? branch.morningStartWorkingTime;
    const aEnd = gb.afternoonEndWorkingTime ?? branch.afternoonEndWorkingTime;
    if (mStart != null && aEnd != null) {
      const fmt = h => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
      hours.push(`${fmt(mStart)} - ${fmt(aEnd)}`);
    }

    const rating = branch.totalStar && branch.totalRating
      ? (branch.totalStar / branch.totalRating).toFixed(1)
      : null;

    // Courts
    const coresData = data.get_cores;
    const courts = [];
    if (coresData?.cores) {
      for (const c of coresData.cores) {
        courts.push({ id: c.id, name: c.name, status: c.status });
      }
    }

    // Payment info
    const paymentsData = data.get_payments;
    const payments = [];
    if (Array.isArray(paymentsData)) {
      for (const p of paymentsData) {
        payments.push({
          bank: p.bank || '',
          accountName: p.accountName || '',
          accountNumber: p.accountNumber || '',
          qr: p.qr || '',
        });
      }
    }

    venues.push({
      name: gb.name || branch.name || id,
      address: gb.address || branch.address || '',
      url: `https://datlich.alobo.vn/dat-lich/${id}`,
      latitude: lat || null,
      longitude: lng || null,
      phone: gb.phone || branch.phone || '',
      hours: hours.join(', '),
      rating: rating ? parseFloat(rating) : null,
      ratingCount: branch.totalRating || 0,
      hasVoucher: branch.hasVoucher || false,
      sports: ['pickleball'],
      courtCount: courts.length,
      courts,
      pricing_tables: tables.map(t => t.rows),
      pricing_table_names: tables.map(t => t.tableName),
      promotions: [],
      flat_prices: [],
      payments,
    });
  }

  const outFile = path.join(OUT, 'courts.json');
  fs.writeFileSync(outFile, JSON.stringify(venues, null, 2));
  console.log(`Exported ${venues.length} venues → ${outFile}`);

  const publicFile = path.join(__dirname, '..', 'public', 'courts.json');
  try {
    fs.writeFileSync(publicFile, JSON.stringify(venues, null, 2));
    console.log(`  Also wrote → ${publicFile}`);
  } catch (e) {
    console.warn('  (Could not write public/courts.json — run from repo root with public/ present)');
  }

  const withCoords = venues.filter(v => v.latitude && v.longitude).length;
  const withTables = venues.filter(v => v.pricing_tables.length > 0).length;
  const withCourts = venues.filter(v => v.courtCount > 0).length;
  const withPayments = venues.filter(v => v.payments.length > 0).length;
  const totalCourts = venues.reduce((s, v) => s + v.courtCount, 0);
  console.log(`  With coordinates: ${withCoords}`);
  console.log(`  With pricing tables: ${withTables}`);
  console.log(`  With courts: ${withCourts} (${totalCourts} total courts)`);
  console.log(`  With payment info: ${withPayments}`);
}

main();
