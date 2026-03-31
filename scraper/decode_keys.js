/**
 * Decode the obfuscated config keys from main.dart.js
 *
 * The obfuscation is: base64 → XOR with key name → permute with prime indices
 */

// Replicate A.ekj() — generates [1,2,3] + primes from 4 until length 20
function ekj() {
  const s = [1, 2, 3];
  let q = 4;
  while (s.length < 20) {
    let isPrime = true;
    for (let o = 2; o <= Math.floor(Math.sqrt(q)); o++) {
      if (q % o === 0) { isPrime = false; break; }
    }
    if (isPrime) s.push(q);
    q++;
  }
  return s;
}

// Replicate A.ekk(a) — prime indices first, then remaining in order
function ekk(a) {
  const o = ekj();
  const n = [];
  const m = new Set();
  for (const q of o) {
    if (q < a) n.push(q);
    m.add(q);
  }
  for (let p = 0; p < a; ++p) {
    if (m.has(p)) continue;
    n.push(p);
  }
  return n;
}

// Replicate A.ekl(a) — pick chars at permuted indices
function ekl(a) {
  const o = a.length;
  const n = ekk(o);
  const p = [];
  for (const q of n) {
    if (q >= o) break;
    p.push(a.charCodeAt(q));
  }
  return String.fromCharCode(...p);
}

// Replicate A.ekm(a, b) — base64 decode + XOR with key name
function ekm(a, b) {
  const q = Buffer.from(a, 'base64');
  const p = q.length;
  const o = new Array(p);
  for (let r = 0; r < p; ++r) {
    o[r] = q[r] ^ b.charCodeAt(r % b.length);
  }
  return String.fromCharCode(...o);
}

// Replicate A.KW(keyName)
function KW(keyName, obfuscatedValue) {
  return ekl(ekm(obfuscatedValue, keyName));
}

// Config map from line 298687 of main.dart.js
const CONFIG = {
  "X_USER_APP_KEY":     "aGxha3Zkbng2Mm98I24+OmE2d2pmI2ZpOy93bGo5M2o=",
  "ENCRYPT_KEY":        "dQ8vYmsyYW8UcG8FeQdrBgM7OigmKyA0Nw1oYWQmfHc=",
  "ENCRYPT_LOCAL_KEY":  "dH9wZ2tnZ2Z4enVze2tzfAZzfntja2NkZnR4d3QTaXs=",
  "ENCRYPT_LOCAL_IV":   "Ng8pGx8iBBotCQgxO2p9LjJ2NmAubWk0",
  "GOONG_WEB_KEY":      "FgYCIDYJIAt3MQIkEAYLPwd2NGYUBDEMIWEoCwscNxU6PBIsLikIFA==",
  "GOONG_MOBILE_KEY":   "LwEOKSgaK3c1MCEzbhEUMAIGJ3geJQsANjkpBG4EFT4/LCQqEhoMNg==",
  "VIET_QR_API_KEY":    "ZiohYXIzZmx2Mys8ZnI4N3snZHJ8az0nMn8+KnBhby8nYjkw",
};

console.log("=== Decoded Config Keys ===\n");
console.log("Prime indices (ekj):", ekj(), "\n");

for (const [name, obfuscated] of Object.entries(CONFIG)) {
  const decoded = KW(name, obfuscated);
  const hexBytes = Buffer.from(decoded).toString('hex');
  console.log(`${name}:`);
  console.log(`  obfuscated: ${obfuscated}`);
  console.log(`  decoded:    ${decoded}`);
  console.log(`  hex:        ${hexBytes}`);
  console.log(`  length:     ${decoded.length} chars / ${Buffer.from(decoded).length} bytes`);
  console.log();
}

// Now show how x-user-app is generated
import crypto from 'node:crypto';

const xUserAppKey = KW("X_USER_APP_KEY", CONFIG["X_USER_APP_KEY"]);
const now = new Date();

// Format: MM/dd/yyyy, HH:mm  (matching Dart's DateFormat)
const pad2 = n => String(n).padStart(2, '0');
const formatted = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()}, ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

const input = formatted + "@" + xUserAppKey;
const utf8Bytes = Buffer.from(input, 'utf8');

// B.zA is SHA-256 (from the pattern: hash → hex)
const sha256 = crypto.createHash('sha256').update(utf8Bytes).digest();
const xUserApp = sha256.toString('hex');

console.log("=== x-user-app Generation ===\n");
console.log(`  Formatted date: ${formatted}`);
console.log(`  Secret key:     ${xUserAppKey}`);
console.log(`  Input string:   ${input}`);
console.log(`  SHA256 hex:     ${xUserApp}`);

// Test: decrypt with the ENCRYPT_KEY
const encryptKey = KW("ENCRYPT_KEY", CONFIG["ENCRYPT_KEY"]);
console.log("\n=== AES Decryption Test ===\n");
console.log(`  ENCRYPT_KEY decoded: ${encryptKey}`);
console.log(`  ENCRYPT_KEY hex:     ${Buffer.from(encryptKey).toString('hex')}`);
console.log(`  ENCRYPT_KEY length:  ${Buffer.from(encryptKey).length} bytes`);
