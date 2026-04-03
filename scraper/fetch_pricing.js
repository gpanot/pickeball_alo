#!/usr/bin/env node
/**
 * Fetch pricing for pickleball venues by:
 * 1. Loading the site in Puppeteer
 * 2. Skipping onboarding
 * 3. Capturing x-user-app from the app's own API calls (refreshing it periodically)
 * 4. Using page.evaluate(fetch(...)) to call detail endpoints
 * 5. Decrypting responses with our AES key
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

const AES_KEY = Buffer.from('Al0b0@Doczy2025_5679_Secret_1107', 'utf8');
const LIMIT = parseInt(process.argv[2] || '0', 10); // 0 = all

function decrypt(ivB64, dataB64) {
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(dataB64, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const branchData = JSON.parse(fs.readFileSync(path.join(OUT, 'decrypted_3.json'), 'utf8'));
  let pickleIds = branchData.branches
    .filter(b => {
      const t = (b.name + ' ' + (b.nameEn || '')).toLowerCase();
      return t.includes('pickle') || t.includes('pickleball') || b.type === 5;
    })
    .map(b => b.id);

  if (LIMIT > 0) pickleIds = pickleIds.slice(0, LIMIT);
  console.log(`Venues to fetch: ${pickleIds.length}${LIMIT ? ' (limited)' : ''}`);

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: false,
    defaultViewport: { width: 430, height: 932 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await client.send('Network.enable');

  let capturedXUserApp = null;
  let xuaCapturedAt = 0;
  // Only capture from the Flutter app's own requests (alobo.vn domains),
  // ignore our page.evaluate fetch() calls which use user-global.alobo.vn
  const APP_ENDPOINTS = ['branches_first', 'branches', 'get_quick_search'];
  client.on('Network.requestWillBeSent', (params) => {
    const h = params.request.headers['x-user-app'];
    if (!h) return;
    const url = params.request.url;
    if (APP_ENDPOINTS.some(ep => url.includes(ep))) {
      capturedXUserApp = h;
      xuaCapturedAt = Date.now();
    }
  });

  async function refreshXUserApp() {
    console.log('\n  Refreshing x-user-app via page reload …');
    const oldXua = capturedXUserApp;
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    for (let w = 0; w < 20; w++) {
      await sleep(500);
      if (capturedXUserApp && capturedXUserApp !== oldXua) break;
    }
    if (capturedXUserApp === oldXua) {
      // Reload didn't trigger new API calls — try clicking to dismiss onboarding
      await page.mouse.click(355, 28);
      await sleep(1000);
      await page.mouse.click(215, 898);
      await sleep(2000);
      for (let w = 0; w < 10; w++) {
        await sleep(500);
        if (capturedXUserApp && capturedXUserApp !== oldXua) break;
      }
    }
    console.log(`  New x-user-app: ${capturedXUserApp?.slice(0, 16)}… (age: ${Date.now() - xuaCapturedAt}ms)`);
  }

  console.log('Loading datlich.alobo.vn …');
  await page.goto('https://datlich.alobo.vn', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  console.log('Skipping onboarding …');
  await page.mouse.click(355, 28); // "Bỏ Qua"
  await sleep(2000);
  await page.mouse.click(215, 898); // "Tiếp tục"
  await sleep(2000);
  await page.mouse.click(355, 28);
  await sleep(3000);

  if (!capturedXUserApp) {
    console.log('Waiting for x-user-app …');
    await sleep(10000);
  }

  if (!capturedXUserApp) {
    console.log('ERROR: Could not capture x-user-app.');
    await browser.close();
    return;
  }
  console.log(`x-user-app: ${capturedXUserApp.slice(0, 16)}…`);

  const API_BASE = 'https://user-global.alobo.vn/v2/user/branch';
  const endpoints = ['get_core_types', 'get_branch', 'get_cores', 'get_payments'];
  const XUA_MAX_AGE_MS = 25_000; // refresh every 25s to stay within the ~1min window

  // Resume from previous progress
  let allPricing = {};
  const progressFile = path.join(OUT, 'pricing_progress.json');
  if (fs.existsSync(progressFile)) {
    try {
      allPricing = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      console.log(`Resuming: ${Object.keys(allPricing).length} venues already fetched`);
    } catch {}
  }

  // Filter out already-fetched venues (only keep those with ALL endpoints)
  const alreadyDone = new Set(
    Object.entries(allPricing)
      .filter(([, v]) => {
        return endpoints.every(ep => {
          const d = v[ep];
          return d && !d.error;
        });
      })
      .map(([k]) => k)
  );
  const remaining = pickleIds.filter(id => !alreadyDone.has(id));

  let fetchedCount = alreadyDone.size;
  let errors = 0;
  const batchSize = 5;
  const maxVenues = pickleIds.length;

  console.log(`\nFetching ${remaining.length} remaining of ${maxVenues} venues (batch=${batchSize}) …\n`);

  for (let i = 0; i < remaining.length; i += batchSize) {
    // Refresh x-user-app if it's getting stale
    if (Date.now() - xuaCapturedAt > XUA_MAX_AGE_MS) {
      await refreshXUserApp();
    }

    const batch = remaining.slice(i, i + batchSize);
    const xua = capturedXUserApp;

    const results = await page.evaluate(async (args) => {
      const { batch, apiBase, xua, endpoints } = args;
      const out = {};
      for (const venueId of batch) {
        out[venueId] = {};
        for (const ep of endpoints) {
          try {
            const res = await fetch(`${apiBase}/${ep}/${venueId}`, {
              headers: { 'x-user-app': xua },
            });
            out[venueId][ep] = await res.text();
          } catch (e) {
            out[venueId][ep] = `ERROR: ${e.message}`;
          }
        }
      }
      return out;
    }, { batch, apiBase: API_BASE, xua, endpoints });

    let batchHadTimeError = false;
    for (const [venueId, epResults] of Object.entries(results)) {
      const venueData = {};
      for (const [ep, raw] of Object.entries(epResults)) {
        if (raw.startsWith('ERROR:')) {
          venueData[ep] = { error: raw };
          errors++;
          continue;
        }
        try {
          const json = JSON.parse(raw);
          if (json.enc === true && json.data && json.iv) {
            const plain = decrypt(json.iv, json.data);
            venueData[ep] = JSON.parse(plain);
          } else if (json.message) {
            venueData[ep] = { error: json.message };
            errors++;
            if (json.message.includes('thời gian') || json.message.includes('time')) {
              batchHadTimeError = true;
            }
          } else {
            venueData[ep] = json;
          }
        } catch (e) {
          venueData[ep] = { error: e.message, raw: raw.slice(0, 200) };
          errors++;
        }
      }
      allPricing[venueId] = venueData;
      fetchedCount++;
    }

    // If we got time errors, force immediate refresh and retry this batch
    if (batchHadTimeError) {
      console.log(`\n  Time error detected at batch ${i}. Forcing refresh …`);
      await refreshXUserApp();
      // Remove failed venues from allPricing so they'll be retried
      for (const venueId of batch) {
        const v = allPricing[venueId];
        if (v && Object.values(v).some(ep => ep.error)) {
          delete allPricing[venueId];
          fetchedCount--;
        }
      }
      i -= batchSize; // retry this batch
      continue;
    }

    const pct = ((fetchedCount / maxVenues) * 100).toFixed(1);
    process.stdout.write(`\r  [${pct}%] ${fetchedCount}/${maxVenues}  errors: ${errors}`);

    if (fetchedCount % 50 === 0) {
      fs.writeFileSync(progressFile, JSON.stringify(allPricing, null, 2));
    }
  }

  console.log('');
  fs.writeFileSync(path.join(OUT, 'pricing_all.json'), JSON.stringify(allPricing, null, 2));
  console.log(`\nSaved: output/pricing_all.json (${fetchedCount} venues, ${errors} errors)`);

  // Summary
  let withPrice = 0, withTargets = 0, withCourts = 0, withPayment = 0;
  for (const v of Object.values(allPricing)) {
    const ct = v.get_core_types;
    if (Array.isArray(ct) && ct.length > 0) { withPrice++; if (ct[0].targets) withTargets++; }
    const gc = v.get_cores;
    if (gc?.cores?.length > 0) withCourts++;
    const gp = v.get_payments;
    if (Array.isArray(gp) && gp.length > 0 && gp[0].accountName) withPayment++;
  }
  console.log(`With pricing: ${withPrice}  With courts: ${withCourts}  With bank info: ${withPayment}`);

  // Show first venue detail
  const sampleId = pickleIds[0];
  const sample = allPricing[sampleId];
  console.log(`\n─── Sample: ${sampleId} ───`);
  for (const [ep, data] of Object.entries(sample || {})) {
    if (data.error) console.log(`  ${ep}: ERROR - ${data.error}`);
    else console.log(`  ${ep}: ${JSON.stringify(data).slice(0, 400)}`);
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
