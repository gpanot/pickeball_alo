#!/usr/bin/env node
/**
 * 1. Handle onboarding (click through it)
 * 2. Capture encrypted API responses via CDP
 * 3. Try decrypting with our AES key
 * 4. Use CDP Debugger to extract the x-user-app secret from Dart runtime
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

async function screenshot(page, name) {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p });
  console.log(`[SCREENSHOT] ${p}`);
}

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

  // ── Collect all alobo network responses ──
  const responseMap = new Map();
  const encrypted = [];

  client.on('Network.requestWillBeSent', (params) => {
    if (!params.request.url.includes('alobo.vn')) return;
    responseMap.set(params.requestId, {
      url: params.request.url,
      method: params.request.method,
      reqHeaders: params.request.headers,
    });
  });

  client.on('Network.loadingFinished', async (params) => {
    const entry = responseMap.get(params.requestId);
    if (!entry) return;
    try {
      const { body, base64Encoded } = await client.send('Network.getResponseBody', { requestId: params.requestId });
      const text = base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
      entry.body = text;
      console.log(`[NET] ${entry.method} ${entry.url} → ${text.length} bytes`);

      try {
        const json = JSON.parse(text);
        if (json.enc === true && json.data && json.iv) {
          encrypted.push({ url: entry.url, data: json.data, iv: json.iv, headers: entry.reqHeaders });
          console.log(`  → Encrypted payload (iv=${json.iv.slice(0, 12)}…)`);

          // Immediately try to decrypt
          try {
            const plain = decrypt(json.iv, json.data);
            console.log(`  → ✓ DECRYPTED! (${plain.length} chars): ${plain.slice(0, 200)}`);
            const fname = `decrypted_${encrypted.length}.json`;
            fs.writeFileSync(path.join(OUT, fname), plain);
            console.log(`  → Saved to output/${fname}`);
          } catch (e) {
            console.log(`  → ✗ Decrypt failed: ${e.message}`);
          }
        }
      } catch { /* not JSON */ }
    } catch { /* body not available */ }
  });

  // ── Navigate ──
  console.log('Navigating to datlich.alobo.vn …');
  await page.goto('https://datlich.alobo.vn', { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3000);
  await screenshot(page, '01_after_load');

  // ── Handle onboarding ──
  console.log('\n[ONBOARDING] Attempting to skip onboarding …');

  // Strategy: click at common "Skip" / "Continue" button positions on the canvas
  // The Flutter canvas fills the viewport, buttons are typically:
  //   - Bottom center: "Get Started" / "Continue"
  //   - Top right: "Skip"
  //   - Bottom right: "Next"

  const vw = 430, vh = 932;
  const clickTargets = [
    { x: vw / 2, y: vh * 0.88, label: 'bottom center (Continue/Start)' },
    { x: vw - 60, y: 50, label: 'top right (Skip)' },
    { x: vw / 2, y: vh * 0.75, label: 'mid-low center' },
    { x: vw - 40, y: vh * 0.88, label: 'bottom right (Next)' },
  ];

  for (let round = 0; round < 5; round++) {
    for (const target of clickTargets) {
      console.log(`  Click: ${target.label} (${target.x}, ${target.y})`);
      await page.mouse.click(target.x, target.y);
      await sleep(800);
    }
    await sleep(1500);
    await screenshot(page, `02_onboarding_round_${round}`);

    // Check if we got any API responses yet
    if (encrypted.length > 0) {
      console.log(`  Got encrypted responses! Onboarding likely passed.`);
      break;
    }
  }

  // Also try swiping left (common for onboarding carousels)
  console.log('\n[ONBOARDING] Trying swipe gestures …');
  for (let i = 0; i < 5; i++) {
    await page.mouse.move(vw * 0.8, vh / 2);
    await page.mouse.down();
    await page.mouse.move(vw * 0.2, vh / 2, { steps: 10 });
    await page.mouse.up();
    await sleep(500);
    // Click bottom center after each swipe
    await page.mouse.click(vw / 2, vh * 0.88);
    await sleep(800);
  }
  await screenshot(page, '03_after_swipes');

  // Also try keyboard
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Enter');
    await sleep(500);
    await page.keyboard.press('Escape');
    await sleep(500);
  }

  console.log('\n[WAITING] Waiting 20s for API calls after onboarding …');
  await sleep(20000);
  await screenshot(page, '04_after_wait');

  // ── Extract x-user-app via Debugger ──
  console.log('\n═══ Attempting to extract x-user-app secret via CDP Debugger ═══\n');

  await client.send('Debugger.enable');

  // Find main.dart.js script ID
  const scripts = [];
  client.on('Debugger.scriptParsed', (p) => {
    if (p.url.includes('main.dart.js')) scripts.push(p);
  });

  // The script is already parsed. Let's search for it.
  // Use Runtime.evaluate to call the function that generates x-user-app,
  // by navigating to a URL that triggers it, or by reloading

  // Actually, let's try evaluating JS on the page that accesses the Dart scope
  // through known entry points. The dartMainRunner or _flutter might leak scope.
  const runtimeResult = await page.evaluate(() => {
    const results = {};

    // Try accessing through _flutter namespace (Flutter web)
    try {
      if (window._flutter) results._flutter = Object.keys(window._flutter).join(', ');
    } catch (e) { results._flutter_err = e.message; }

    // Try self.A, window.A (some dart2js builds leak these)
    for (const name of ['A', 'B', 'C', 'J', 'init', '$']) {
      try {
        const v = eval(name);
        if (v && typeof v === 'object') {
          results[name] = `object with ${Object.keys(v).length} keys`;
          if (typeof v.dxJ === 'function') results[name + '_dxJ'] = v.dxJ();
          if (typeof v.KW === 'function') {
            results[name + '_ENCRYPT_KEY'] = v.KW('ENCRYPT_KEY');
            results[name + '_X_USER_APP_KEY'] = v.KW('X_USER_APP_KEY');
          }
        }
      } catch { /* not accessible */ }
    }

    return results;
  });
  console.log('Runtime eval results:', JSON.stringify(runtimeResult, null, 2));

  // ── Save all captured data ──
  const allResponses = [...responseMap.values()].filter(r => r.body);
  fs.writeFileSync(path.join(OUT, 'all_responses.json'), JSON.stringify(allResponses, null, 2));
  fs.writeFileSync(path.join(OUT, 'encrypted_payloads.json'), JSON.stringify(encrypted, null, 2));

  // ── Summary ──
  console.log('\n═══ SUMMARY ═══');
  console.log(`Total network responses: ${allResponses.length}`);
  console.log(`Encrypted payloads: ${encrypted.length}`);
  console.log(`Screenshots in output/`);

  if (encrypted.length > 0) {
    console.log(`\nx-user-app from browser: ${encrypted[0].headers?.['x-user-app'] || 'N/A'}`);
  }

  console.log('\nBrowser stays open for inspection. Ctrl+C to exit.');
  await new Promise(() => {});
}

main().catch(e => { console.error(e); process.exit(1); });
