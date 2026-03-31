(function() {
  'use strict';

  const send = (detail) =>
    window.dispatchEvent(new CustomEvent('__alobo__', { detail }));

  /** Dio / Flutter often pass objects; only capturing strings drops the JSON body. */
  function serializeArg(a) {
    if (a === null || a === undefined) return '';
    if (typeof a === 'string') return a;
    if (typeof a === 'number' || typeof a === 'boolean' || typeof a === 'bigint')
      return String(a);
    if (a instanceof Error) return a.stack || a.message || String(a);
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch (e) {
        return String(a);
      }
    }
    return String(a);
  }

  /** PrettyDioLogger box-drawing; variants seen across terminals / builds */
  const BLOCK_END_CHARS = ['\u255a', '\u2559', '\u255d', '\u2514', '\u2518']; // ╚ ╙ ╝ └ ┘
  const LOOKS_API =
    /alobo|branch|get_quick|user-global|user-api|"name"\s*:|"dia_chi"|"address"\s*:|enc"\s*:\s*true|PrettyDio|DioException/i;

  /** Production builds often omit PrettyDio box chars; accept likely API / venue JSON. */
  function mightBeAppPayload(s) {
    if (!s || s.indexOf('{') === -1) return false;
    if (
      /Google Maps JavaScript API|goo\.gle\/js-api-loading|NOT a vento tab|ventoRecording/i.test(s) &&
      !/"enc"\s*:\s*true|dia_chi|branch|get_quick|sport_type|latitude/i.test(s)
    ) {
      return false;
    }
    return (
      /"enc"\s*:\s*true/.test(s) ||
      /"iv"\s*:\s*"/.test(s) ||
      /dia_chi|full_address|branch_id|sport_type|open_time|latitude|longitude|get_quick|pickle|san_|\.alobo\.vn/i.test(
        s
      ) ||
      (/"name"\s*:\s*"/.test(s) && /"(id|branch_id|slug)"\s*:/.test(s))
    );
  }

  function shouldSendBlock(block) {
    return LOOKS_API.test(block) || mightBeAppPayload(block);
  }

  function lineEndsBlock(line) {
    return BLOCK_END_CHARS.some((ch) => line.includes(ch));
  }

  const orig = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
  };

  let buffer = [];
  const MAX_BUFFER_LINES = 400;
  let idleTimer = null;
  const IDLE_MS = 1200;

  function flushBlock(reason) {
    if (!buffer.length) return;
    const block = buffer.join('\n');
    buffer = [];
    if (shouldSendBlock(block)) {
      send({ type: 'LOG_BLOCK', block, reason: reason || 'terminator' });
    }
  }

  function scheduleIdleFlush() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (!buffer.length) return;
      const block = buffer.join('\n');
      if (shouldSendBlock(block)) {
        buffer = [];
        send({ type: 'LOG_BLOCK', block, reason: 'idle_flush' });
      } else if (buffer.length > 150) {
        buffer = buffer.slice(75);
      }
    }, IDLE_MS);
  }

  function onConsoleLine(method, args) {
    orig[method].apply(console, args);
    const txt = args.map(serializeArg).join(' ');
    if (!txt.trim()) return;

    buffer.push(txt);
    scheduleIdleFlush();

    if (buffer.length > MAX_BUFFER_LINES) {
      flushBlock('overflow');
      return;
    }

    // Single-line JSON (common when logger prints body as one object)
    const t = txt.trim();
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try {
        JSON.parse(t);
        if (shouldSendBlock(t)) send({ type: 'LOG_BLOCK', block: t, reason: 'single_json' });
      } catch (e) { /* not valid JSON */ }
    }

    if (lineEndsBlock(txt)) flushBlock('box');
  }

  function makeHook(method) {
    return function(...args) {
      onConsoleLine(method, args);
    };
  }

  const hookedLog = makeHook('log');
  const hookedDebug = makeHook('debug');
  const hookedInfo = makeHook('info');
  const hookedWarn = makeHook('warn');

  function lockConsoleMethod(name, fn) {
    try {
      Object.defineProperty(console, name, {
        value: fn,
        writable: false,
        configurable: false,
      });
    } catch (e) {
      console[name] = fn;
    }
  }

  lockConsoleMethod('log', hookedLog);
  lockConsoleMethod('debug', hookedDebug);
  lockConsoleMethod('info', hookedInfo);
  lockConsoleMethod('warn', hookedWarn);

  orig.log('[ALOBO] Console hook locked (log/debug/info/warn, SES-proof)');
})();
