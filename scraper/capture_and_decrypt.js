#!/usr/bin/env node
/**
 * Capture actual browser request headers + encrypted response, then decrypt with our key.
 * This verifies:  (1) our AES key can decrypt  (2) what x-user-app the browser sends
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

  const captured = [];

  client.on('Network.requestWillBeSent', (params) => {
    if (!params.request.url.includes('alobo.vn/v2/')) return;
    captured.push({
      requestId: params.requestId,
      url: params.request.url,
      method: params.request.method,
      headers: params.request.headers,
      postData: params.request.postData,
    });
    console.log(`\n[REQ] ${params.request.method} ${params.request.url}`);
    console.log('  Headers:', JSON.stringify(params.request.headers, null, 2));
  });

  client.on('Network.responseReceived', async (params) => {
    const entry = captured.find(c => c.requestId === params.requestId);
    if (!entry) return;
    try {
      const { body, base64Encoded } = await client.send('Network.getResponseBody', { requestId: params.requestId });
      const text = base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
      entry.responseStatus = params.response.status;
      entry.responseHeaders = params.response.headers;
      entry.responseBody = text;
      console.log(`\n[RES] ${params.response.status} ${entry.url}`);
      console.log(`  Body (first 200): ${text.slice(0, 200)}`);

      // Try decrypt
      try {
        const json = JSON.parse(text);
        if (json.enc === true && json.data && json.iv) {
          console.log('\n  ══ ATTEMPTING DECRYPTION ══');
          const plain = decrypt(json.iv, json.data);
          console.log(`  ✓ DECRYPTION SUCCESSFUL!`);
          console.log(`  Plaintext (first 500): ${plain.slice(0, 500)}`);
          entry.decrypted = plain;
          fs.writeFileSync(path.join(OUT, 'decrypted_response.json'), plain);
          console.log('  Saved to output/decrypted_response.json');
        }
      } catch (e) {
        console.log(`  Decrypt error: ${e.message}`);
      }
    } catch { /* body unavailable */ }
  });

  console.log('Navigating to datlich.alobo.vn …');
  await page.goto('https://datlich.alobo.vn', { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('Page loaded. Waiting 20s for API calls …');
  await new Promise(r => setTimeout(r, 20000));

  // Save all captured data
  fs.writeFileSync(path.join(OUT, 'captured_requests.json'), JSON.stringify(captured, null, 2));
  console.log(`\nSaved ${captured.length} captured requests to output/captured_requests.json`);

  // Show summary
  console.log('\n═══ SUMMARY ═══');
  for (const c of captured) {
    console.log(`  ${c.method} ${c.url} → ${c.responseStatus || 'pending'}`);
    if (c.headers?.['x-user-app']) console.log(`    x-user-app: ${c.headers['x-user-app']}`);
    if (c.decrypted) console.log(`    ✓ Decrypted ${c.decrypted.length} chars`);
  }

  console.log('\nBrowser stays open. Press Ctrl+C to exit.');
  await new Promise(() => {});
}

main().catch(e => { console.error(e); process.exit(1); });
