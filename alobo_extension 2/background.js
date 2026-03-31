// background.js - receives decryption key + encrypted responses, decrypts venues

let aesKeyHex = null;
let encryptedQueue = [];  // {url, data, iv} waiting for key
let venues = {};
let stats = { keys: 0, decrypted: 0, venues: 0, jsonFromConsole: 0, encryptedQueued: 0 };

// ── AES-CBC decryption using Web Crypto ────────────────────────────────────
async function decryptAES(keyHex, ivB64, dataB64) {
  const keyBytes = hexToBytes(keyHex);
  const iv       = b64ToBytes(ivB64);
  const ct       = b64ToBytes(dataB64);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ct);
  return new TextDecoder().decode(plain);
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i/2] = parseInt(hex.slice(i, i+2), 16);
  return arr;
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ── Venue extraction ───────────────────────────────────────────────────────
function isVenue(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = new Set(Object.keys(obj));
  const signals = [
    'name', 'address', 'dia_chi', 'title', 'location', 'slug',
    'full_address', 'ten', 'open_time', 'phone', 'open_at', 'sport_type',
    'branch_name', 'branch_id', 'distance', 'km', 'opening_hours',
    'latitude', 'longitude', 'lat', 'lng',
  ];
  const hits = signals.filter((k) => keys.has(k)).length;
  // Single strong signal + id (listing cards often have name + numeric id)
  if (hits >= 2) return true;
  if (hits >= 1 && (keys.has('id') || keys.has('branch_id')) && keys.has('name')) return true;
  return false;
}

function findVenues(data, depth = 0) {
  if (depth > 7 || !data) return [];
  const out = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (isVenue(item)) out.push(item);
      else out.push(...findVenues(item, depth + 1));
    }
  } else if (typeof data === 'object') {
    if (isVenue(data)) return [data];
    const wrappers = ['data','items','results','venues','list','records',
                      'content','payload','clubs','courts','san','branches',
                      'branch_list', 'branchList', 'rows', 'docs'];
    let hit = false;
    for (const k of wrappers) {
      if (data[k] !== undefined) { out.push(...findVenues(data[k], depth+1)); hit = true; }
    }
    if (!hit) for (const v of Object.values(data)) out.push(...findVenues(v, depth+1));
  }
  return out;
}

function extractPrices(raw) {
  const text = JSON.stringify(raw);
  const prices = [];
  for (const m of text.matchAll(/(\d[\d.,]{2,})\s*(?:đ|VND|vnđ|₫)/gi)) {
    const v = parseFloat(m[1].replace(/[.,]/g,''));
    if (v > 10000 && v < 5000000) prices.push(v);
  }
  return [...new Set(prices)].sort((a,b)=>a-b);
}

function ingestVenues(parsed, sourceUrl) {
  const found = findVenues(parsed);
  let added = 0;
  for (const item of found) {
    const name = item.name || item.title || item.ten || '';
    if (!name || venues[name]) continue;
    const slug = item.slug || item.alias || item.id || '';
    const prices = extractPrices(item);
    venues[name] = {
      name,
      address: item.address || item.dia_chi || item.location || item.full_address || '',
      url: item.url || item.link || (slug ? `https://datlich.alobo.vn/dat-lich/${slug}` : ''),
      sports: [].concat(item.sport||[], item.sports||[], item.sport_type||[], item.category||[])
               .map(s=>String(s).toLowerCase()).filter(Boolean),
      prices,
      phone: item.phone || '',
      hours: item.open_time && item.close_time ? `${item.open_time} - ${item.close_time}` : '',
      raw: item,
    };
    added++;
  }
  if (added > 0) {
    stats.venues = Object.keys(venues).length;
    chrome.storage.local.set({ venues: Object.values(venues), stats });
    console.log(`[Alobo] +${added} venues (total: ${stats.venues}) from ${sourceUrl}`);
  }
}

async function tryDecryptAndIngest(entry) {
  if (!aesKeyHex) return false;
  try {
    const plain = await decryptAES(aesKeyHex, entry.iv, entry.data);
    stats.decrypted++;
    const parsed = JSON.parse(plain);
    console.log('[Alobo] Decrypted:', entry.url);
    ingestVenues(parsed, entry.url);
    return true;
  } catch(e) {
    console.log('[Alobo] Decrypt failed:', e.message);
    return false;
  }
}

// ── Message handler ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'AES_KEY') {
    const hex = msg.key;
    if (hex && hex.length >= 32 && hex !== aesKeyHex) {
      aesKeyHex = hex;
      stats.keys++;
      console.log('[Alobo] AES key captured:', hex);
      chrome.storage.local.set({ aesKey: hex });
      // Drain the queue
      const queue = [...encryptedQueue];
      encryptedQueue = [];
      queue.forEach(e => tryDecryptAndIngest(e));
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'ENCRYPTED_RESPONSE') {
    const entry = { url: msg.url, data: msg.data, iv: msg.iv };
    if (aesKeyHex) {
      tryDecryptAndIngest(entry);
    } else {
      encryptedQueue.push(entry);
      console.log('[Alobo] Queued encrypted response, waiting for key...');
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'RAW_RESPONSE') {
    try {
      const b = msg.body;
      stats.jsonFromConsole = (stats.jsonFromConsole || 0) + 1;
      chrome.storage.local.set({ stats });
      // Dio often logs the wire shape: { data, enc: true, iv } — route to decrypt queue
      if (
        b &&
        typeof b === 'object' &&
        !Array.isArray(b) &&
        b.enc === true &&
        typeof b.data === 'string' &&
        typeof b.iv === 'string'
      ) {
        const entry = { url: msg.url || 'console', data: b.data, iv: b.iv };
        if (aesKeyHex) {
          tryDecryptAndIngest(entry);
        } else {
          encryptedQueue.push(entry);
          stats.encryptedQueued = (stats.encryptedQueued || 0) + 1;
          chrome.storage.local.set({ stats });
          console.log('[Alobo] Queued encrypted payload from console (need AES key in app memory)');
        }
      } else {
        ingestVenues(b, msg.url);
      }
    } catch (e) { /* ignore */ }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GET_VENUES') {
    sendResponse({ venues: Object.values(venues), stats, hasKey: !!aesKeyHex });
    return true;
  }

  if (msg.type === 'CLEAR') {
    venues = {};
    encryptedQueue = [];
    stats = { keys: 0, decrypted: 0, venues: 0, jsonFromConsole: 0, encryptedQueued: 0 };
    chrome.storage.local.set({ venues: [], stats });
    sendResponse({ ok: true });
    return true;
  }
});

// Restore on startup
chrome.storage.local.get(['venues', 'aesKey', 'stats'], (result) => {
  if (result.aesKey) { aesKeyHex = result.aesKey; console.log('[Alobo] Restored AES key'); }
  if (result.stats && typeof result.stats === 'object') {
    stats = { ...stats, ...result.stats };
  }
  if (result.venues) {
    result.venues.forEach(v => { if (v.name) venues[v.name] = v; });
    stats.venues = Object.keys(venues).length;
    console.log(`[Alobo] Restored ${stats.venues} venues`);
  }
});
