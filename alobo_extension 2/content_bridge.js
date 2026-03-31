// content_bridge.js - ISOLATED world, bridges events to background

/** Extract every balanced {...} or [...] substring that parses as JSON (handles greedy-regex failures). */
function extractJsonValues(text) {
  const out = [];
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== '{' && c !== '[') continue;
    const open = c;
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = i; j < s.length; j++) {
      const ch = s[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          const slice = s.slice(i, j + 1);
          try {
            out.push(JSON.parse(slice));
          } catch (e) { /* skip */ }
          break;
        }
      }
    }
  }
  return out;
}

/** Remove PrettyDioLogger left gutter (║ …) so JSON sits at line start for the brace scanner. */
function stripDioMargins(block) {
  return block
    .split('\n')
    .map((l) => l.replace(/^.*?║\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
}

window.addEventListener('__alobo__', (e) => {
  const d = e.detail;

  if (d.type === 'AES_KEY') {
    chrome.runtime.sendMessage({ type: 'AES_KEY', key: d.key });
  }

  if (d.type === 'FETCH') {
    const body = d.body;
    if (body?.enc === true) {
      chrome.runtime.sendMessage({ type: 'ENCRYPTED_RESPONSE', url: d.url, data: body.data, iv: body.iv });
    } else {
      chrome.runtime.sendMessage({ type: 'RAW_RESPONSE', url: d.url, body });
    }
  }

  if (d.type === 'DECRYPTED') {
    try {
      const parsed = JSON.parse(d.plain);
      chrome.runtime.sendMessage({ type: 'RAW_RESPONSE', url: d.url || 'crypto', body: parsed });
    } catch (e) { /* ignore */ }
  }

  if (d.type === 'LOG_BLOCK') {
    const block = d.block;
    const candidates = extractJsonValues(block);
    for (const parsed of candidates) {
      chrome.runtime.sendMessage({
        type: 'RAW_RESPONSE',
        url: 'dio_log:' + (d.reason || 'block'),
        body: parsed,
      });
    }
    if (!candidates.length) {
      const stripped = stripDioMargins(block);
      const second = extractJsonValues(stripped);
      for (const parsed of second) {
        chrome.runtime.sendMessage({
          type: 'RAW_RESPONSE',
          url: 'dio_log:stripped',
          body: parsed,
        });
      }
    }
  }
});
