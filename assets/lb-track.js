/* ============================================================================
   LB-TRACK v1 — first-party event graph for laydbackapps.com (2026-10-11).
   Our own pixel-free tracking: pageviews, scroll depth, call clicks, form
   submits. Sends keepalive beacons to our API; no cookies, no third parties.
   Attribution: utm_* + click ids (fbclid/gclid/ttclid/msclkid/wbraid/gbraid)
   captured on first AND last touch into localStorage, merged per event.
   ========================================================================== */
(function () {
  var API = 'https://laydback-hq.tail5b3740.ts.net/functions/v1/track';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function sid() {
    var s = lsGet('lb_sid');
    if (!s) { s = 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36); lsSet('lb_sid', s); }
    return s;
  }

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_KEYS = ['fbclid', 'gclid', 'ttclid', 'msclkid', 'wbraid', 'gbraid'];

  function current() {
    var out = { utm: {}, click_ids: {} };
    try {
      var q = new URLSearchParams(location.search);
      UTM_KEYS.forEach(function (k) { var v = q.get(k); if (v) out.utm[k] = String(v).slice(0, 120); });
      CLICK_KEYS.forEach(function (k) { var v = q.get(k); if (v) out.click_ids[k] = String(v).slice(0, 200); });
    } catch (e) {}
    return out;
  }

  function attribution() {
    var cur = current();
    var hasNew = Object.keys(cur.utm).length || Object.keys(cur.click_ids).length;
    if (hasNew) {
      lsSet('lb_attr_last', JSON.stringify(cur));
      if (!lsGet('lb_attr_first')) lsSet('lb_attr_first', JSON.stringify(cur));
    }
    var first = {}, last = {};
    try { first = JSON.parse(lsGet('lb_attr_first') || '{}'); } catch (e) {}
    try { last = JSON.parse(lsGet('lb_attr_last') || '{}'); } catch (e) {}
    var merged = { utm: {}, click_ids: {} };
    [first, last, cur].forEach(function (o) {
      if (!o) return;
      Object.keys(o.utm || {}).forEach(function (k) { merged.utm[k] = o.utm[k]; });
      Object.keys(o.click_ids || {}).forEach(function (k) { merged.click_ids[k] = o.click_ids[k]; });
    });
    return merged;
  }

  var queue = [];
  var flushing = false;

  function flush() {
    if (flushing || !queue.length) return;
    var batch = queue.splice(0, 30);
    flushing = true;
    var payload = JSON.stringify({ events: batch });
    var done = function () { flushing = false; if (queue.length) flush(); };
    // keepalive fetch with text/plain = simple request (no preflight, survives
    // pagehide). sendBeacon with application/json is silently dropped by Chrome
    // cross-origin (non-safelisted type) — never use it for JSON.
    try {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
        keepalive: true
      }).then(done, done);
      return;
    } catch (e) {}
    if (navigator.sendBeacon) {
      try { navigator.sendBeacon(API, new Blob([payload], { type: 'text/plain;charset=UTF-8' })); } catch (e) {}
    }
    done();
  }

  function ev(type, extra) {
    var a = attribution();
    var e = {
      type: type, session: sid(),
      path: location.pathname, url: location.href.slice(0, 500),
      ref: (document.referrer || '').slice(0, 250),
      utm: a.utm, click_ids: a.click_ids, ts: Date.now()
    };
    if (extra) { Object.keys(extra).forEach(function (k) { e[k] = extra[k]; }); }
    queue.push(e);
    flush();
  }

  // pageview
  ev('pageview');

  // scroll depth, once each at 50% / 90%
  var hits = {};
  addEventListener('scroll', function () {
    var d = (scrollY + innerHeight) / Math.max(1, document.body.scrollHeight);
    [0.5, 0.9].forEach(function (t) {
      if (d >= t && !hits[t]) { hits[t] = 1; ev('scroll', { meta: { depth: t } }); }
    });
  }, { passive: true });

  // phone-call clicks
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (el) ev('call_click', { meta: { tel: String(el.getAttribute('href')).slice(0, 32) } });
  }, true);

  // form submits (any form; tagged for the conversion bus)
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.tagName !== 'FORM') return;
    ev('form_submit', { meta: {
      form: String(f.id || f.getAttribute('name') || 'form').slice(0, 48),
      action: String(f.getAttribute('action') || location.pathname).slice(0, 200)
    } });
  }, true);

  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  window.lbtrack = ev;
})();
