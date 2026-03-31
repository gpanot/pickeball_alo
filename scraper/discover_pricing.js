#!/usr/bin/env node
/**
 * Navigate to a single venue page to discover pricing API endpoints.
 * Capture and decrypt all API responses.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

const AES_KEY = Buffer.from('Al0b0@Doczy2025_5679_Secret_1107', 'utf8');

function decrypt(ivB64, dataB64) {
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(dataB64, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: false,
    defaultViewport: { width: 430, height: 932 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  const client = await page.createCDPSession();
  await client.send('Network.enable');

  const allCalls = [];

  client.on('Network.requestWillBeSent', (params) => {
    if (!params.request.url.includes('alobo.vn/v')) return;
    allCalls.push({
      id: params.requestId,
      method: params.request.method,
      url: params.request.url,
      postData: params.request.postData,
    });
  });

  client.on('Network.loadingFinished', async (params) => {
    const entry = allCalls.find(c => c.id === params.requestId);
    if (!entry) return;
    try {
      const { body, base64Encoded } = await client.send('Network.getResponseBody', { requestId: params.requestId });
      const text = base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
      entry.responseBody = text;

      try {
        const json = JSON.parse(text);
        if (json.enc === true && json.data && json.iv) {
          const plain = decrypt(json.iv, json.data);
          entry.decrypted = plain;
          console.log(`\n[API] ${entry.method} ${entry.url}`);
          if (entry.postData) {
            try {
              const pd = JSON.parse(entry.postData);
              if (pd.enc) {
                const pplain = decrypt(pd.iv, pd.data);
                console.log(`  Request body: ${pplain.slice(0, 300)}`);
                entry.decryptedPostData = pplain;
              } else {
                console.log(`  Request body: ${entry.postData.slice(0, 300)}`);
              }
            } catch { console.log(`  Request body: ${entry.postData.slice(0, 200)}`); }
          }
          console.log(`  Response (${plain.length} chars): ${plain.slice(0, 400)}`);
        }
      } catch { /* not JSON */ }
    } catch { /* body unavail */ }
  });

  // Navigate to the site first (to establish session)
  console.log('Loading datlich.alobo.vn …');
  await page.goto('https://datlich.alobo.vn', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  // Skip onboarding by clicking bottom center
  const vw = 430, vh = 932;
  console.log('Skipping onboarding …');
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(vw / 2, vh * 0.88);
    await sleep(1000);
  }
  await sleep(3000);

  // Now navigate to a specific venue page
  const testVenueId = 'sport_pickleball_699';
  const venueUrl = `https://datlich.alobo.vn/dat-lich/${testVenueId}`;
  console.log(`\nNavigating to venue: ${venueUrl}`);
  await page.goto(venueUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(5000);

  // Click on "Service" tab — usually the second tab near the top
  console.log('Attempting to click Service tab …');
  // Try clicking at various tab positions (tabs are usually near the top, around y=300-400)
  const tabPositions = [
    { x: vw * 0.5, y: 350, label: 'center tab area' },
    { x: vw * 0.5, y: 380, label: 'service tab attempt 1' },
    { x: vw * 0.33, y: 350, label: 'left tab' },
    { x: vw * 0.66, y: 350, label: 'right tab' },
    { x: vw * 0.5, y: 420, label: 'below tabs' },
  ];

  for (const pos of tabPositions) {
    console.log(`  Click: ${pos.label} (${pos.x}, ${pos.y})`);
    await page.mouse.click(pos.x, pos.y);
    await sleep(2000);
  }

  // Scroll down to load more
  console.log('Scrolling down …');
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel({ deltaY: 300 });
    await sleep(1000);
  }

  await sleep(5000);
  await page.screenshot({ path: path.join(OUT, 'venue_page.png') });

  // Save all discovered API calls
  const apiCalls = allCalls.filter(c => c.decrypted);
  fs.writeFileSync(path.join(OUT, 'venue_api_calls.json'), JSON.stringify(apiCalls.map(c => ({
    method: c.method,
    url: c.url,
    postData: c.decryptedPostData || c.postData,
    response: c.decrypted?.slice(0, 2000),
  })), null, 2));

  console.log(`\n═══ DISCOVERED API CALLS ═══`);
  console.log(`Total encrypted API calls: ${apiCalls.length}`);
  for (const c of apiCalls) {
    console.log(`\n  ${c.method} ${c.url}`);
    if (c.decryptedPostData) console.log(`  Body: ${c.decryptedPostData.slice(0, 200)}`);
    console.log(`  Response preview: ${c.decrypted.slice(0, 200)}`);

    // Save full responses
    const fname = `venue_response_${apiCalls.indexOf(c)}.json`;
    fs.writeFileSync(path.join(OUT, fname), c.decrypted);
  }

  console.log('\nBrowser stays open. Ctrl+C to exit.');
  await new Promise(() => {});
}

main().catch(e => { console.error(e); process.exit(1); });
