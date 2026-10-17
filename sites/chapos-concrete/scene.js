/* pro_scene.js — PRO SCENE STANDARD for Laydback lead-site canvas animations.
 * Copy this INTO the site's <script> block (sites are single-file). ~8KB.
 * Goal: make a canvas scene read like a rendered illustration, not a diagram.
 *
 * The seven rules (a scene that breaks any of these reads amateur):
 *  1. LIGHTING: one sun direction for the whole scene. Sky = vertical gradient with a warm
 *     glow near the sun side; every form has a lit face and a shaded face (lit = toward sun).
 *  2. DEPTH: atmospheric perspective — far geometry blends toward the haze colour, near
 *     geometry is darkest/most saturated. Draw far layers first.
 *  3. CONTACT: nothing floats. Every object gets a soft elliptical ground shadow whose
 *     alpha grows as it settles; airborne objects get a small, tight shadow.
 *  4. MATERIALITY: every large surface carries a texture pass (speckle/grain/streaks),
 *     clipped to the surface, at 2–5% alpha. Flat fills = plastic = amateur.
 *  5. MOTION: no linear motion. Ease-in-out for placement, ease-out for releases,
 *     slight overshoot on settling. The scroll progress itself is SMOOTHED (lerp) so the
 *     scene glides instead of snapping to the wheel.
 *  6. CAMERA: slow parallax drift (a few px) driven by time + a small scroll offset;
 *     foreground elements move more than background ones.
 *  7. GRADE: finish with a vignette and a fine grain pass at very low alpha, always last.
 */
(function (global) {
  'use strict';
  var PS = {};

  /* ---------- maths ---------- */
  PS.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  PS.lerp = function (a, b, k) { return a + (b - a) * k; };
  PS.smoothstep = function (edge0, edge1, x) {
    var t = PS.clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1); return t * t * (3 - 2 * t);
  };
  PS.ease = {
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in: function (t) { return t * t * t; },
    back: function (t) { var s = 1.70158; t = PS.clamp(t, 0, 1); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); }
  };
  /* stage(k, t0, dur) -> smoothed 0..1 (optionally with settle-overshoot) */
  PS.stage = function (p, t0, dur, mode) {
    var t = PS.clamp((p - t0) / (dur || 0.2), 0, 1);
    if (mode === 'place') return PS.ease.inOut(t);
    if (mode === 'settle') return PS.ease.back(t);
    if (mode === 'release') return PS.ease.out(t);
    return PS.smoothstep(0, 1, t);
  };

  /* ---------- palette helpers ---------- */
  PS.rgb = function (c) {
    if (Array.isArray(c)) return c;
    if (typeof c === 'string' && c.slice(0, 3) === 'rgb') {          // already "rgb(r,g,b)"
      var m = c.match(/-?\d+(\.\d+)?/g) || [0, 0, 0];
      return [Math.round(+m[0] || 0), Math.round(+m[1] || 0), Math.round(+m[2] || 0)];
    }
    var hex = String(c).replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (!isFinite(n)) return [128, 128, 128];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  PS.mix = function (c1, c2, k) {
    var a = PS.rgb(c1), b = PS.rgb(c2);
    return 'rgb(' + Math.round(PS.lerp(a[0], b[0], k)) + ',' + Math.round(PS.lerp(a[1], b[1], k)) + ',' + Math.round(PS.lerp(a[2], b[2], k)) + ')';
  };
  PS.rgba = function (c, a) {
    var v = PS.rgb(c);
    return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')';
  };
  PS.lighten = function (c, k) { return PS.mix(c, [255, 255, 255], k); };
  PS.darken = function (c, k) { return PS.mix(c, [8, 10, 14], k); };

  /* ---------- setup / loop ---------- */
  /* PS.setup(canvas, opts)
   *   opts.sun      : 'left' | 'right'  (default 'left')
   *   opts.sky      : [topHex, horizonHex, hazeHex]  (haze = colour far geometry fades to)
   *   opts.reduce   : bool (respect prefers-reduced-motion)
   *   opts.progress : function() -> 0..1 (scroll progress; omit for a fixed p)
   *   opts.onFrame  : function(S, p, time)  — your draw code
   * S = state: {ctx,W,H,DPR,project(x,y,z),projectAt(yaw,x,y,z),shadow(...),sun,sky,rng}
   */
  PS.setup = function (canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(global.devicePixelRatio || 1, 2);
    var S = {
      ctx: ctx, W: 0, H: 0, DPR: DPR, sun: opts.sun || 'left',
      skyCols: opts.sky || ['#0b1622', '#16324c', '#2b4a63'],
      reduce: !!opts.reduce, sunAngle: opts.sun === 'right' ? 1 : -1
    };
    S.rng = (function (seed) {           // deterministic texture noise
      var s = seed || 1301;
      return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    })(opts.seed);

    S.resize = function () {
      S.W = canvas.clientWidth || canvas.offsetWidth || global.innerWidth;
      S.H = canvas.clientHeight || canvas.offsetHeight || global.innerHeight;
      if (!S.W || !S.H) return false;
      canvas.width = Math.round(S.W * DPR); canvas.height = Math.round(S.H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      return true;
    };

    /* perspective camera: floor y=0, camera at height camH looking down the z axis.
     * horizon = 0.52H, focal = 1.05H. y is height ABOVE the floor (world units). */
    S.horizon = 0; S.focal = 0; S.camH = 1.7;
    S.cam = function () { S.focal = S.H * (opts.focal || 1.05); S.horizon = S.H * (opts.horizon || 0.52); };
    S.project = function (x, y, z) {
      if (z < 0.55) z = 0.55;
      var s = S.focal / z;
      return [S.W / 2 + x * s + (opts.driftX || 0) * s, S.horizon + (S.camH - y) * s];
    };
    /* fog: 0 = near (full colour), 1 = at the horizon (blend to haze) */
    S.fog = function (z) { return PS.clamp((z - (opts.fogNear || 3)) / ((opts.fogFar || 26) - (opts.fogNear || 3)), 0, 1); };
    S.skyColour = function (k) { return PS.mix(S.skyCols[0], S.skyCols[2], PS.clamp(k, 0, 1)); };

    /* ---------- drawing primitives ---------- */
    S.poly = function (pts, fill, stroke, alpha, lw) {
      if (alpha !== undefined && alpha <= 0) return;
      ctx.save(); if (alpha !== undefined) ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.lineJoin = 'round'; ctx.stroke(); }
      ctx.restore();
    };
    S.sky = function (glowK) {
      var g = ctx.createLinearGradient(0, 0, 0, S.H);
      g.addColorStop(0, S.skyCols[0]); g.addColorStop(0.62, S.skyCols[1]); g.addColorStop(1, S.skyCols[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, S.W, S.H);
      if (glowK !== 0) {                                  // warm sun-side glow above the horizon
        var gx = S.sunAngle < 0 ? S.W * 0.18 : S.W * 0.82, r = Math.max(S.W, S.H) * 0.55;
        var rg = ctx.createRadialGradient(gx, S.horizon - S.H * 0.06, 0, gx, S.horizon - S.H * 0.06, r);
        rg.addColorStop(0, PS.rgba(opts.glow || '#ffb877', (glowK === undefined ? 0.22 : glowK)));
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, S.W, S.H);
      }
    };
    S.haze = function (k) {                                // horizon haze band
      var kk = k === undefined ? 0.5 : k;
      var g = ctx.createLinearGradient(0, S.horizon - S.H * 0.10, 0, S.horizon + S.H * 0.05);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, PS.rgba(S.skyCols[2], 0.55 * kk)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, S.horizon - S.H * 0.10, S.W, S.H * 0.15);
    };
    /* contact shadow: ellipse on the floor plane under an object at (x,z) */
    S.shadow = function (x, z, rx, rz, alpha, col) {
      var c = S.project(x, 0.001, z), sx = S.focal / z;
      ctx.save();
      ctx.translate(c[0], c[1]);
      ctx.scale(1, PS.clamp((rz || rx * 0.5) * sx / (rx * sx), 0.05, 1) * 0.42 + 0.12);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * sx);
      g.addColorStop(0, PS.rgba(col || '#04070c', (alpha === undefined ? 0.5 : alpha)));
      g.addColorStop(0.7, PS.rgba(col || '#04070c', (alpha === undefined ? 0.5 : alpha) * 0.35));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx * sx, 0, 6.2832); ctx.fill();
      ctx.restore();
    };
    /* material texture: clip to the polygon `pts` and speckle/streak it */
    S.texture = function (pts, kind, density, alpha) {
      density = density || 260; alpha = alpha === undefined ? 0.05 : alpha;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath(); ctx.clip();
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var n = Math.min(density, Math.round((x1 - x0) * (y1 - y0) / 260));
      for (var k = 0; k < n; k++) {
        var px = x0 + S.rng() * (x1 - x0), py = y0 + S.rng() * (y1 - y0), r = 0.4 + S.rng() * (kind === 'grain' ? 1.6 : 0.9);
        ctx.fillStyle = S.rng() > 0.5 ? 'rgba(255,255,255,' + alpha + ')' : 'rgba(0,0,0,' + alpha * 1.35 + ')';
        if (kind === 'streak') { ctx.fillRect(px, py, r * 6, 0.7); }
        else if (kind === 'aggregate') { ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill(); }
        else { ctx.fillRect(px, py, r, r); }
      }
      ctx.restore();
    };
    S.dust = function (n, time) {
      n = n || 26;
      for (var i = 0; i < n; i++) {
        var seedX = (i * 97 % 100) / 100, seedY = (i * 57 % 100) / 100;
        var drift = ((time * (0.004 + (i % 5) * 0.0016) + seedY) % 1);
        var px = seedX * S.W + Math.sin(time * 0.0004 + i) * 16;
        var py = S.horizon - S.H * 0.05 + (1 - drift) * S.H * 0.5;
        ctx.globalAlpha = 0.05 + 0.10 * Math.abs(Math.sin(time * 0.0006 + i * 1.7));
        ctx.fillStyle = i % 4 === 0 ? PS.rgba(opts.glow || '#ffb877', 0.9) : 'rgba(215,230,245,.75)';
        ctx.beginPath(); ctx.arc(px, py, 0.5 + (i % 3) * 0.5, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    S.grade = function () {                                  // vignette + grain, ALWAYS last
      var g = ctx.createRadialGradient(S.W / 2, S.H * 0.5, Math.min(S.W, S.H) * 0.35, S.W / 2, S.H * 0.5, Math.max(S.W, S.H) * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S.W, S.H);
      for (var i = 0; i < 120; i++) {
        ctx.fillStyle = S.rng() > 0.5 ? 'rgba(255,255,255,.014)' : 'rgba(0,0,0,.02)';
        ctx.fillRect(S.rng() * S.W, S.rng() * S.H, 1.2, 1.2);
      }
    };
    /* small scale cues that make a scene read real: cone, person silhouette, board */
    S.scaleCue = function (x, z, kind) {
      var s = S.focal / z;
      if (kind === 'person') {
        var b = S.project(x, 0, z), h = 1.72 * s * 0.32;
        S.poly([[b[0] - 0.1 * s * 0.32, b[1]], [b[0] + 0.1 * s * 0.32, b[1]], [b[0] + 0.07 * s * 0.32, b[1] - h], [b[0] - 0.07 * s * 0.32, b[1] - h]], 'rgba(10,14,20,.72)');
        ctx.beginPath(); ctx.arc(b[0], b[1] - h - 0.12 * s * 0.32, 0.11 * s * 0.32, 0, 6.2832); ctx.fillStyle = 'rgba(10,14,20,.72)'; ctx.fill();
      } else {                                               // traffic cone
        var c = S.project(x, 0, z), hh = 0.55 * s * 0.32;
        S.poly([[c[0] - 0.16 * s * 0.32, c[1]], [c[0] + 0.16 * s * 0.32, c[1]], [c[0] + 0.02 * s * 0.32, c[1] - hh]], '#ff6a1a');
      }
    };


    /* mottling: tonal patches + edge rim + contact AO — what makes a flat fill read as a material */
    S.mottle = function (pts, baseCol, amount, patches) {
      amount = amount === undefined ? .10 : amount;
      patches = patches || 22;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath(); ctx.clip();
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys),
          x1 = Math.max.apply(null, xs), y1 = Math.max.apply(null, ys);
      for (var k = 0; k < patches; k++) {
        var cx = x0 + S.rng() * (x1 - x0), cy = y0 + S.rng() * (y1 - y0),
            r = (0.10 + S.rng() * 0.30) * Math.max(24, (x1 - x0) * 0.35);
        var dark = S.rng() > 0.45;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, dark ? PS.rgba('#2b2f34', amount) : PS.rgba('#ffffff', amount * 0.8));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    };
    /* AO: darkens the ground tight against a form's base (grounds it in the scene) */
    S.contactAO = function (x, z, halfW, depth, alpha) {
      var a = S.project(x - halfW, 0.002, z - depth), b = S.project(x + halfW, 0.002, z - depth),
          c = S.project(x + halfW, 0.002, z + depth), d = S.project(x - halfW, 0.002, z + depth);
      var g = ctx.createRadialGradient((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2,
                                       Math.max(30, Math.abs(b[0] - a[0]) * 0.9));
      g.addColorStop(0, PS.rgba('#05080d', alpha === undefined ? .38 : alpha)); g.addColorStop(1, 'rgba(0,0,0,0)');
      S.poly([a, b, c, d], g, null, 1);
    };
    /* long cast shadow for a vertical form, thrown AWAY from the sun (sun is left) */
    S.castShadow = function (x, z, halfW, height, len, alpha) {
      var dir = S.sunAngle < 0 ? 1 : -1;                      // shadow falls to the +x side when the sun is left
      var a = S.project(x - halfW, 0.003, z), b = S.project(x + halfW, 0.003, z),
          c = S.project(x + halfW + dir * len, 0.003, z + len * 0.35),
          d = S.project(x - halfW + dir * len, 0.003, z + len * 0.35);
      S.poly([a, b, c, d], PS.rgba('#0a0f16', alpha === undefined ? .30 : alpha), null, 1);
    };
    /* rim light along an edge facing the sun */
    S.rim = function (p1, p2, col, alpha, lw) {
      ctx.save(); ctx.globalAlpha = alpha === undefined ? .8 : alpha;
      ctx.strokeStyle = col || 'rgba(255,226,186,.9)'; ctx.lineWidth = lw || 2;
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.restore();
    };

    /* ---------- palette helpers exposed on S too (scenes often use S.mix) ---------- */
    S.mix = PS.mix; S.rgba = PS.rgba; S.lighten = PS.lighten; S.darken = PS.darken;

    /* ---------- frame loop ---------- */
    var t0 = 0, last = 0, current = 0, lastDraw = 0;
    function targetP() { return opts.progress ? PS.clamp(opts.progress(), 0, 1) : (opts.p || 0); }
    /* draw exactly one frame, synchronously, swallowing errors so a bad frame can never
       leave the hero blank or kill the loop */
    S.drawOnce = function (p, time) {
      if (!S.W || !S.H) { if (!S.resize()) return; S.cam(); }
      try { opts.onFrame(S, p === undefined ? current : p, time || 0); lastDraw = Date.now(); }
      catch (e) { if (!S._errOnce) { S._errOnce = true; if (global.console) console.warn('[scene] frame error', e); } }
    };
    S.frame = function (ts) {
      if (!t0) t0 = ts;
      var dt = Math.min(64, ts - last); last = ts;                 // ms
      if (!S.W || !S.H) { if (S.resize()) S.cam(); }
      if (S.W && S.H) {
        var target = opts.progress ? PS.clamp(opts.progress(), 0, 1) : (opts.p || 0);
        /* frame-rate independent smoothing: the scene glides, never snaps */
        current = PS.lerp(current, target, S.reduce ? 1 : 1 - Math.pow(0.0018, dt / 1000));
        if (Math.abs(target - current) < 0.0004) current = target;
        lastDraw = Date.now();
        try { opts.onFrame(S, current, ts - t0); lastDraw = Date.now(); }
        catch (e) { if (!S._errOnce) { S._errOnce = true; if (global.console) console.warn('[scene] frame error', e); } }
      }
      if (!S.reduce) global.requestAnimationFrame(S.frame);
    };
    /* watchdog: if rAF is throttled (hidden tab, headless, power saving) or the loop died,
       repaint at least 4x/second so the hero is never a blank canvas */
    S.watch = function () {
      if (S.reduce || S._watching) return; S._watching = true;
      global.setInterval(function () {
        if (Date.now() - lastDraw > 260) S.drawOnce(targetP(), Date.now());
      }, 250);
    };
    S.start = function () {
      function boot() {
        var tries = (boot.tries = (boot.tries || 0) + 1);
        if (!S.resize()) {                                  // wait for layout, but never forever
          if (tries < 40) { global.requestAnimationFrame(boot); return; }
          S.W = global.innerWidth || 1280; S.H = global.innerHeight || 720;
        }
        S.cam();
        current = opts.progress ? PS.clamp(opts.progress(), 0, 1) : (opts.p || 0);
        S.drawOnce(current, 0);                              // FIRST PAINT IS SYNCHRONOUS
        if (!S.reduce) { global.requestAnimationFrame(S.frame); S.watch(); }
      }
      boot();
      /* second synchronous attempt after layout settles (covers slow fonts/sticky layout) */
      global.setTimeout(function () { S.drawOnce(targetP(), 0); }, 120);
    };
    global.addEventListener('resize', function () { if (S.resize()) S.cam(); });
    return S;
  };

  PS.reduceMotion = function () { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  PS.queryP = function () { try { var v = new URLSearchParams(global.location.search).get('p'); return v === null ? null : PS.clamp(parseFloat(v) || 0, 0, 1); } catch (e) { return null; } };
  global.PS = PS;
  if (typeof module !== 'undefined' && module.exports) module.exports = PS;
})(typeof window !== 'undefined' ? window : this);

/* Chapo's Concrete — driveway pour scene (Barossa Valley light) */
/* Stage map:
 *  0.00–0.18  formwork goes up          (place)
 *  0.18–0.38  concrete placed          (release)
 *  0.38–0.70  float / finish           (place + settle overshoot)
 *  0.70–0.90  broom texture + joints   (place)
 *  0.90–1.00  cure + car drives on     (settle)
 */
(function () {
  'use strict';

  var cv = document.getElementById('buildCanvas');
  var wrap = document.getElementById('sceneWrap');
  var stgNum = document.getElementById('stgNum');
  var stgName = document.getElementById('stgName');

  var fixedP = PS.queryP();
  var NAMES = [
    ['01', 'Formed'],
    ['02', 'Poured'],
    ['03', 'Floated'],
    ['04', 'Broom finish'],
    ['05', 'Cured']
  ];

  var S = PS.setup(cv, {
    sun: 'left',
    seed: 42,
    p: fixedP === null ? 0 : fixedP,
    reduce: PS.reduceMotion() || fixedP !== null,
    sky: ['#0d1a26', '#1a3d4f', '#c98b5e'],
    glow: '#e8b86e',
    fogNear: 3,
    fogFar: 34,
    horizon: 0.44,
    focal: 1.25,
    camH: 1.45,
    progress: fixedP !== null ? null : function () {
      var r = wrap.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      return span <= 0 ? 1 : PS.clamp(-r.top / span, 0, 1);
    },
    onFrame: draw
  });

  /* Barossa palette */
  var DIRT = '#4a3b2c', DIRT_D = '#2e251b';
  var TIMBER = '#8a6a42', TIMBER_D = '#6b4f2f';
  var STEEL = '#9aa6b4';
  var CONC_WET = '#8b9099', CONC_DRY = '#c9c8c3', CONC_BROOM = '#b8b5ad';
  var HIVIS = '#e8e2d2';
  var SKY_WARM = '#e8b86e';
  var TIRE = '#1a1a1a', CAR_BODY = '#2d2d2d', CAR_WINDOW = '#1a2a3a';
  var PLANT_GREEN = '#2d4a2b', PLANT_DARK = '#1a2e18';

  function treeLine(S, z, baseY, amp, col, alpha) {
    var pts = [], x;
    for (x = -46; x <= 46; x += 1.6) {
      var h = Math.sin(x * 0.37) * 0.5 + Math.sin(x * 0.13 + 1.7) * 0.9 + Math.sin(x * 1.1) * 0.16;
      pts.push(S.project(x, baseY + Math.max(0, h) * amp, z));
    }
    var first = S.project(-46, baseY, z), last = S.project(46, baseY, z);
    var poly = [[first[0], first[1]]].concat(pts).concat([[last[0], last[1]]]);
    S.poly(poly, col, null, alpha);
  }

  function house(S, x, z, w, h, col, alpha) {
    var a = S.project(x - w / 2, 0, z), b = S.project(x + w / 2, 0, z);
    var s = S.focal / z, top = a[1] - h * s * 0.34;
    S.poly([[a[0], a[1]], [b[0], b[1]], [b[0], top], [a[0], top]], col, null, alpha);
    S.poly([[a[0], top], [b[0], top], [(a[0] + b[0]) / 2, top - (w * 0.28) * s * 0.34]], col, null, alpha);
  }

  function barrow(S, x, z, col) {
    var g = S.project(x, 0, z), s = S.focal / z * 0.32;
    S.shadow(x, z, 0.55, 0.3, .4);
    S.poly([[g[0] - .42 * s, g[1] - .3 * s], [g[0] + .42 * s, g[1] - .3 * s], [g[0] + .30 * s, g[1] - .62 * s], [g[0] - .30 * s, g[1] - .62 * s]], col);
    S.poly([[g[0] + .42 * s, g[1] - .3 * s], [g[0] + .86 * s, g[1] - .26 * s], [g[0] + .80 * s, g[1] - .14 * s], [g[0] + .40 * s, g[1] - .16 * s]], col);
  }

  function car(S, x, z, bodyCol, windowCol, tireCol, scale) {
    scale = scale || 1;
    var b = S.project(x, 0, z), s = S.focal / z * 0.32 * scale;
    var w = 1.8 * s, len = 4.2 * s, h = 1.2 * s;
    S.shadow(x, z, 1.8, 4.2, .45);
    /* body */
    S.poly([
      [b[0] - w / 2, b[1]],
      [b[0] + w / 2, b[1]],
      [b[0] + w / 2 - 0.3 * s, b[1] - h * 0.7],
      [b[0] - w / 2 + 0.3 * s, b[1] - h * 0.7]
    ], bodyCol);
    /* roof */
    S.poly([
      [b[0] - w / 2 + 0.2 * s, b[1] - h * 0.7],
      [b[0] + w / 2 - 0.2 * s, b[1] - h * 0.7],
      [b[0] + w / 2 - 0.5 * s, b[1] - h],
      [b[0] - w / 2 + 0.5 * s, b[1] - h]
    ], S.darken(bodyCol, 0.15));
    /* windows */
    S.poly([
      [b[0] - w / 2 + 0.25 * s, b[1] - h * 0.7],
      [b[0] + w / 2 - 0.25 * s, b[1] - h * 0.7],
      [b[0] + w / 2 - 0.45 * s, b[1] - h * 0.9],
      [b[0] - w / 2 + 0.45 * s, b[1] - h * 0.9]
    ], windowCol);
    /* tires */
    S.poly([[b[0] - 0.7 * s, b[1]], [b[0] - 0.3 * s, b[1]], [b[0] - 0.3 * s, b[1] + 0.4 * s], [b[0] - 0.7 * s, b[1] + 0.4 * s]], tireCol);
    S.poly([[b[0] + 0.3 * s, b[1]], [b[0] + 0.7 * s, b[1]], [b[0] + 0.7 * s, b[1] + 0.4 * s], [b[0] + 0.3 * s, b[1] + 0.4 * s]], tireCol);
  }

  function draw(S, p, time) {
    var ctx = S.ctx, W = S.W, H = S.H;

    /* stage progress */
    var t1 = PS.stage(p, 0.00, 0.18, 'place');      // formwork up
    var t2 = PS.stage(p, 0.18, 0.20, 'release');    // pour
    var t3 = PS.stage(p, 0.38, 0.32, 'place');      // float
    var t4 = PS.stage(p, 0.70, 0.20, 'place');      // broom + joints
    var t5 = PS.stage(p, 0.90, 0.10, 'settle');     // cure + car

    /* ---------- SKY: vertical gradient + warm left glow + sun disk ---------- */
    S.sky(0);
    var sg = ctx.createLinearGradient(0, 0, 0, S.horizon + 8);
    sg.addColorStop(0, '#0e2c46');
    sg.addColorStop(0.45, '#2d5473');
    sg.addColorStop(0.78, '#8d7a72');
    sg.addColorStop(1, '#e0a06a');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, S.horizon + 8);

    /* cloud bands */
    for (var ci = 0; ci < 11; ci++) {
      var cy = S.horizon * (0.10 + ci * 0.075), cw = W * (0.34 + 0.10 * ci), cx = W * (0.02 + ((ci * 0.29 + time * 0.000010) % 1) * 0.96);
      var cg = ctx.createLinearGradient(0, cy - 20, 0, cy + 22);
      var ca = 0.07 + 0.09 * Math.abs(Math.sin(ci * 1.7));
      cg.addColorStop(0, 'rgba(255,224,196,0)');
      cg.addColorStop(0.42, PS.rgba(ci % 3 === 0 ? '#ffe6cf' : '#ffcfae', ca));
      cg.addColorStop(0.62, PS.rgba('#ffd0aa', ca * 0.6));
      cg.addColorStop(1, 'rgba(255,208,170,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx, cy, cw * 0.5, 8 + ci * 2.6, ci * 0.008 - 0.02, 0, 6.2832); ctx.fill();
    }
    /* wispy streaks */
    for (var wsi = 0; wsi < 2; wsi++) {
      var wy = S.horizon * (0.16 + wsi * 0.14), wg = ctx.createLinearGradient(0, wy - 7, 0, wy + 7);
      wg.addColorStop(0, 'rgba(255,236,214,0)'); wg.addColorStop(0.5, 'rgba(255,236,214,.13)'); wg.addColorStop(1, 'rgba(255,236,214,0)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(W * (0.30 + wsi * 0.34), wy, W * 0.42, 7 + wsi * 3, -0.03, 0, 6.2832); ctx.fill();
    }
    /* sun + glow left of centre */
    var sunX = W * 0.30, sunY = S.horizon - S.H * 0.055;
    var ag = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(W, H) * 0.42);
    ag.addColorStop(0, 'rgba(255,224,182,.85)'); ag.addColorStop(0.18, 'rgba(255,190,132,.34)'); ag.addColorStop(1, 'rgba(255,170,110,0)');
    ctx.fillStyle = ag; ctx.fillRect(0, 0, W, S.horizon + 40);
    ctx.fillStyle = 'rgba(255,242,214,.95)'; ctx.beginPath(); ctx.arc(sunX, sunY, Math.max(11, S.H * 0.022), 0, 6.2832); ctx.fill();

    /* ---------- DISTANT: ridges + treeline + houses ---------- */
    treeLine(S, 78, 0.02, 3.0, PS.mix(S.skyCols[2], '#54606c', 0.30), 0.30);
    treeLine(S, 52, 0.01, 2.4, PS.mix(S.skyCols[2], '#22323f', 0.5), 0.5);
    house(S, -26, 44, 7.0, 3.2, PS.mix(S.skyCols[2], '#26323c', 0.45), .5);
    house(S, 22, 40, 6.0, 2.8, PS.mix(S.skyCols[2], '#26323c', 0.5), .48);
    S.haze(0.85);
    var vh = ctx.createLinearGradient(0, S.horizon - S.H * 0.012, 0, S.horizon + S.H * 0.075);
    vh.addColorStop(0, 'rgba(255,206,164,.30)'); vh.addColorStop(1, 'rgba(255,206,164,0)');
    ctx.fillStyle = vh; ctx.fillRect(0, S.horizon - S.H * 0.012, W, S.H * 0.09);

    /* ---------- GROUND: graded red-brown Barossa earth, warm light streak ---------- */
    var gN = S.project(0, 0, 2.0), gF = S.project(0, 0, 60);
    var gg = ctx.createLinearGradient(0, gF[1], 0, gN[1]);
    gg.addColorStop(0, PS.mix('#c98b5e', DIRT, 0.72));
    gg.addColorStop(0.3, PS.mix(DIRT, '#7a5c3c', 0.35));
    gg.addColorStop(1, DIRT_D);
    ctx.fillStyle = gg; ctx.fillRect(0, gF[1] - 1, W, gN[1] - gF[1] + 2);
    /* warm light streak */
    var ls = ctx.createLinearGradient(W * 0.30 - 240, 0, W * 0.30 + 240, 0);
    ls.addColorStop(0, 'rgba(255,196,138,0)'); ls.addColorStop(0.5, 'rgba(255,196,138,.13)'); ls.addColorStop(1, 'rgba(255,196,138,0)');
    ctx.fillStyle = ls; ctx.fillRect(0, gF[1] - 1, W, gN[1] - gF[1] + 2);
    S.texture([S.project(-60, 0, 58), S.project(60, 0, 58), S.project(60, 0, 2), S.project(-60, 0, 2)], 'grain', 420, .03);

    var X0 = -4.6, X1 = 4.6, Z0 = 5.2, Z1 = 19.5, SLAB = 0.42;

    /* ---------- excavated pad with scour marks ---------- */
    S.poly([S.project(X0 - 1.3, 0, Z1 + 1.4), S.project(X1 + 1.3, 0, Z1 + 1.4), S.project(X1 + 1.3, 0, Z0 - 1.2), S.project(X0 - 1.3, 0, Z0 - 1.2)], PS.mix(DIRT_D, '#20190f', .30));
    S.texture([S.project(X0 - 1.2, .002, Z1 + 1.3), S.project(X1 + 1.2, .002, Z1 + 1.3), S.project(X1 + 1.2, .002, Z0 - 1.1), S.project(X0 - 1.2, .002, Z0 - 1.1)], 'streak', 240, .045);
    /* spoil heap */
    var hx = S.project(-6.6, 0, Z0 - 1.4), hs = S.focal / (Z0 - 1.4);
    S.poly([[hx[0] - 2.6 * hs * .3, hx[1]], [hx[0] + 2.2 * hs * .3, hx[1]], [hx[0] + 1.4 * hs * .3, hx[1] - 0.85 * hs * .3], [hx[0] - 1.7 * hs * .3, hx[1] - 0.55 * hs * .3]], PS.mix(DIRT, '#8a6a42', .25));
    S.texture([[hx[0] - 2.6 * hs * .3, hx[1]], [hx[0] + 2.2 * hs * .3, hx[1]], [hx[0] + 1.4 * hs * .3, hx[1] - 0.85 * hs * .3], [hx[0] - 1.7 * hs * .3, hx[1] - 0.55 * hs * .3]], 'grain', 160, .05);
    barrow(S, -5.6, Z0 + 1.0, '#6d747c');
    S.scaleCue(-6.4, Z0 + 2.6, 'cone');

    /* ---------- STEEL GRID (progressive) ---------- */
    var barsZ = 14, barsX = 10, bi = 0;
    ctx.lineCap = 'round';
    for (var bz = Z0 + 0.6; bz < Z1 - 0.3; bz += (Z1 - Z0 - 0.9) / barsZ, bi++) {
      var k = PS.clamp((t1 * (barsZ + barsX) - bi) / 1.3, 0, 1); if (k <= 0) continue;
      var sa = S.project(X0 + 0.3, 0.10, bz), sb = S.project(X1 - 0.3, 0.10, bz);
      ctx.globalAlpha = k; ctx.lineWidth = 2.2;
      ctx.strokeStyle = PS.rgba('#3d4148', .9); ctx.beginPath(); ctx.moveTo(sa[0], sa[1] + 1.5); ctx.lineTo(sb[0], sb[1] + 1.5); ctx.stroke();
      ctx.lineWidth = 1.7; ctx.strokeStyle = PS.rgba(STEEL, .95); ctx.beginPath(); ctx.moveTo(sa[0], sa[1]); ctx.lineTo(sb[0], sb[1]); ctx.stroke();
      ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(255,235,214,.5)'; ctx.beginPath(); ctx.moveTo(sa[0], sa[1] - 1.1); ctx.lineTo(sb[0], sb[1] - 1.1); ctx.stroke();
    }
    for (var bx = X0 + 0.6, bj = 0; bx < X1 - 0.3; bx += (X1 - X0 - 1.2) / barsX, bj++) {
      var k2 = PS.clamp((t1 * (barsZ + barsX) - barsZ - bj) / 1.3, 0, 1); if (k2 <= 0) continue;
      var sc = S.project(bx, 0.10, Z0 + 0.4), sd = S.project(bx, 0.10, Z1 - 0.2);
      ctx.globalAlpha = k2 * 0.95; ctx.lineWidth = 1.6;
      ctx.strokeStyle = PS.rgba(STEEL, .8); ctx.beginPath(); ctx.moveTo(sc[0], sc[1]); ctx.lineTo(sd[0], sd[1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* ---------- FORMWORK: timber boards with grain, lit top edge, cool shadow ---------- */
    var boards = [[X0 - 0.18, 'v'], [X1 + 0.18, 'v'], [Z0 - 0.22, 'h'], [Z1 + 0.22, 'h']];
    boards.forEach(function (bd, idx) {
      var k = PS.clamp((t2 - boards.length * 0.06 + idx * 0.06) / 0.5, 0, 1); if (k <= 0) return;
      var hgt = 0.60 - (1 - PS.ease.out(k)) * 0.75;
      var pts = bd[1] === 'v'
        ? [S.project(bd[0] - 0.10, hgt, Z1 + 0.28), S.project(bd[0] + 0.10, hgt, Z1 + 0.28), S.project(bd[0] + 0.10, 0, Z1 + 0.28), S.project(bd[0] - 0.10, 0, Z1 + 0.28)]
        : [S.project(X0 - 0.18, hgt, bd[0]), S.project(X1 + 0.18, hgt, bd[0]), S.project(X1 + 0.18, 0, bd[0]), S.project(X0 - 0.18, 0, bd[0])];
      S.shadow(bd[1] === 'v' ? bd[0] : 0, bd[1] === 'v' ? (Z0 + Z1) / 2 : bd[0], bd[1] === 'v' ? 0.55 : 4.8, bd[1] === 'v' ? 7 : 0.6, .38);
      var face = ctx.createLinearGradient(0, pts[0][1], 0, pts[3][1]);
      face.addColorStop(0, PS.lighten(bd[1] === 'v' ? TIMBER : TIMBER_D, .16));
      face.addColorStop(1, PS.darken(bd[1] === 'v' ? TIMBER_D : TIMBER, .22));
      S.poly(pts, face, PS.rgba('#3a2a1a', .55), 1);
      S.texture(pts, 'streak', 110, .06);
      var e1 = bd[1] === 'v' ? S.project(bd[0] - 0.10, hgt, Z1 + 0.28) : S.project(X0 - 0.18, hgt, bd[0]);
      var e2 = bd[1] === 'v' ? S.project(bd[0] + 0.10, hgt, Z1 + 0.28) : S.project(X1 + 0.18, hgt, bd[0]);
      ctx.strokeStyle = 'rgba(255,226,186,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.stroke();
    });

    /* ---------- CONCRETE: place from far end forward ---------- */
    if (t2 > 0) {
      var zF = Z0 + (Z1 - Z0) * t2;
      var baseWet = PS.mix(CONC_WET, CONC_DRY, PS.clamp(t3 * 1.05, 0, 1));
      var a3 = S.project(X0 + 0.06, SLAB, zF), b3 = S.project(X1 - 0.06, SLAB, zF),
          c3 = S.project(X1 - 0.06, SLAB, Z0 + 0.06), d3 = S.project(X0 + 0.06, SLAB, Z0 + 0.06);
      var g3 = ctx.createLinearGradient(0, a3[1], 0, d3[1]);
      g3.addColorStop(0, PS.lighten(baseWet, .14)); g3.addColorStop(.55, baseWet); g3.addColorStop(1, PS.darken(baseWet, .24));
      S.poly([a3, b3, c3, d3], g3, null, 1);
      S.texture([a3, b3, c3, d3], 'aggregate', 360, .055);

      /* wet gloss while fresh */
      if (t3 < 0.8) {
        var sheen = ctx.createLinearGradient(0, a3[1], 0, a3[1] + (d3[1] - a3[1]) * .30);
        sheen.addColorStop(0, 'rgba(255,238,214,.28)'); sheen.addColorStop(1, 'rgba(255,238,214,0)');
        S.poly([a3, b3, c3, d3], sheen, null, 1);
      }
      /* leading edge highlight */
      ctx.strokeStyle = 'rgba(255,246,232,.55)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(a3[0], a3[1]); ctx.lineTo(b3[0], b3[1]); ctx.stroke();
      /* low-sun glint travelling across wet surface */
      var glintX = S.project(0, SLAB, zF)[0], glintY = (a3[1] + d3[1]) / 2;
      var gl = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, Math.max(90, (d3[1] - a3[1]) * 0.55));
      gl.addColorStop(0, 'rgba(255,238,206,' + (0.26 * (1 - t3)) + ')'); gl.addColorStop(1, 'rgba(255,238,206,0)');
      S.poly([a3, b3, c3, d3], gl, null, 1);

      /* power-float arcs (floating stage) */
      if (t3 > 0.30) {
        ctx.save(); ctx.globalAlpha = PS.clamp((t3 - 0.30) / 0.7, 0, 1) * 0.16; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1;
        for (var ar = 0; ar < 9; ar++) {
          var zc2 = Z0 + 0.9 + ((Z1 - Z0 - 1.4) * (ar / 9)), cx2 = -3.2 + ((ar * 2.7) % 6.4);
          var pc = S.project(cx2, SLAB, zc2), rw = (1.5 + 0.35 * (ar % 3)) * S.focal / zc2;
          ctx.beginPath(); ctx.ellipse(pc[0], pc[1], rw * 0.30, rw * 0.10, 0, 0, 6.2832); ctx.stroke();
        }
        ctx.restore();
        S.texture([a3, b3, c3, d3], 'grain', 260, .035);
      }

      /* screed bar + worker (during pour) */
      if (t2 > 0.12 && t3 < 0.9) {
        var zS = zF;
        var bb1 = S.project(X0 + 0.25, 0.68, zS), bb2 = S.project(X1 - 0.25, 0.68, zS),
            bb3 = S.project(X1 - 0.25, SLAB, zS), bb4 = S.project(X0 + 0.25, SLAB, zS);
        S.shadow(0, zS, 3.9, 0.4, .4);
        var bg = ctx.createLinearGradient(0, bb1[1], 0, bb3[1]);
        bg.addColorStop(0, '#e3e6ea'); bg.addColorStop(1, '#9aa1aa');
        S.poly([bb1, bb2, bb3, bb4], bg, 'rgba(70,76,84,.8)', 1);
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(bb1[0], bb1[1]); ctx.lineTo(bb2[0], bb2[1]); ctx.stroke();
        /* worker silhouette at right end */
        var wx = S.project(X1 + 0.55, 0, zS), ws = S.focal / zS * 0.32;
        S.shadow(X1 + 0.55, zS, 0.5, 0.3, .4);
        S.poly([[wx[0] - 0.16 * ws, wx[1]], [wx[0] + 0.16 * ws, wx[1]], [wx[0] + 0.13 * ws, wx[1] - 1.05 * ws], [wx[0] - 0.13 * ws, wx[1] - 1.05 * ws]], HIVIS);
        ctx.fillStyle = 'rgba(20,24,30,.85)'; ctx.beginPath(); ctx.arc(wx[0], wx[1] - 1.18 * ws, 0.15 * ws, 0, 6.2832); ctx.fill();
        S.poly([[wx[0] + 0.13 * ws, wx[1] - 1.0 * ws], [wx[0] + 0.62 * ws, wx[1] - 0.72 * ws], [wx[0] + 0.58 * ws, wx[1] - 0.6 * ws], [wx[0] + 0.11 * ws, wx[1] - 0.86 * ws]], HIVIS);
      }

      /* control joints (after float) */
      if (t4 > 0.2) {
        ctx.save(); ctx.globalAlpha = PS.clamp((t4 - 0.2) / 0.8, 0, 1) * .75; ctx.strokeStyle = '#7b828a'; ctx.lineWidth = 1.6;
        [0.25, 0.5, 0.75].forEach(function (fr) {
          var zc = Z0 + (Z1 - Z0) * fr, f1 = S.project(X0 + 0.25, SLAB, zc), f2 = S.project(X1 - 0.25, SLAB, zc);
          ctx.beginPath(); ctx.moveTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.stroke();
        });
        ctx.restore();
      }

      /* ---------- BROOM FINISH TEXTURE (stage 4) ---------- */
      if (t4 > 0) {
        var broomAlpha = PS.clamp(t4 / 0.5, 0, 1) * 0.12;
        ctx.save(); ctx.globalAlpha = broomAlpha; ctx.strokeStyle = '#9a9892'; ctx.lineWidth = 0.8;
        var broomCount = Math.round(28 * PS.clamp(t4 / 0.3, 0, 1));
        for (var br = 0; br < broomCount; br++) {
          var zc = Z0 + (Z1 - Z0) * (br / broomCount);
          var bx1 = S.project(X0 + 0.15, SLAB, zc), bx2 = S.project(X1 - 0.15, SLAB, zc);
          var wobble = Math.sin(br * 1.7) * 0.4;
          ctx.beginPath(); ctx.moveTo(bx1[0] + wobble, bx1[1]); ctx.lineTo(bx2[0] + wobble, bx2[1]); ctx.stroke();
        }
        ctx.restore();
        /* dry concrete color shift */
        var dryMix = PS.mix(baseWet, CONC_BROOM, PS.clamp(t4 * 1.2, 0, 1));
        var gDry = ctx.createLinearGradient(0, a3[1], 0, d3[1]);
        gDry.addColorStop(0, PS.lighten(dryMix, .10)); gDry.addColorStop(.55, dryMix); gDry.addColorStop(1, PS.darken(dryMix, .18));
        S.poly([a3, b3, c3, d3], gDry, null, PS.clamp(t4, 0, 1));
        S.texture([a3, b3, c3, d3], 'aggregate', 360, .04);
      }
    }

    /* ---------- SITE CONTEXT (right side): house shell + ute ---------- */
    var shellX = 9.5, shellZ = 13.5, ss = S.focal / shellZ;
    var sb = S.project(shellX, 0, shellZ);
    S.shadow(shellX, shellZ, 3.4, 1.8, .34);
    /* slab + frame */
    S.poly([[sb[0] - 3.1 * ss * .34, sb[1]], [sb[0] + 3.1 * ss * .34, sb[1]], [sb[0] + 3.1 * ss * .34, sb[1] - 0.42 * ss * .34], [sb[0] - 3.1 * ss * .34, sb[1] - 0.42 * ss * .34]], '#c6c5c0');
    var frameTop = sb[1] - 2.9 * ss * .34;
    S.poly([[sb[0] - 3.0 * ss * .34, sb[1] - 0.42 * ss * .34], [sb[0] + 3.0 * ss * .34, sb[1] - 0.42 * ss * .34], [sb[0] + 3.0 * ss * .34, frameTop], [sb[0] - 3.0 * ss * .34, frameTop]], PS.mix('#8a6a42', '#3d4750', .35), null, .92);
    var rimSide = ctx.createLinearGradient(sb[0] - 3.1 * ss * .34, 0, sb[0] + 3.1 * ss * .34, 0);
    rimSide.addColorStop(0, 'rgba(255,206,150,.30)'); rimSide.addColorStop(0.55, 'rgba(255,206,150,0)'); rimSide.addColorStop(1, 'rgba(255,206,150,.16)');
    S.poly([[sb[0] - 3.0 * ss * .34, sb[1] - 0.42 * ss * .34], [sb[0] + 3.0 * ss * .34, sb[1] - 0.42 * ss * .34], [sb[0] + 3.0 * ss * .34, frameTop], [sb[0] - 3.0 * ss * .34, frameTop]], rimSide, null, 1);
    ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = '#f0c79a'; ctx.lineWidth = 1.4;
    for (var sx = -2.8; sx <= 2.8; sx += 0.7) {
      var p1 = S.project(shellX + sx, 0.42, shellZ), p2 = S.project(shellX + sx, 2.9, shellZ);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }
    ctx.restore();
    /* scaffold mast + ute silhouette */
    S.poly([[sb[0] + 3.4 * ss * .34, sb[1]], [sb[0] + 3.7 * ss * .34, sb[1]], [sb[0] + 3.7 * ss * .34, sb[1] - 3.8 * ss * .34], [sb[0] + 3.4 * ss * .34, sb[1] - 3.8 * ss * .34]], '#5c6672', null, .9);
    var ux = S.project(6.4, 0, 10.5), us = S.focal / 10.5 * 0.32;
    S.shadow(6.4, 10.5, 1.5, 0.7, .4);
    S.poly([[ux[0] - 1.7 * us, ux[1]], [ux[0] + 1.7 * us, ux[1]], [ux[0] + 1.5 * us, ux[1] - 0.75 * us], [ux[0] - 1.1 * us, ux[1] - 0.75 * us], [ux[0] - 1.4 * us, ux[1] - 1.15 * us], [ux[0] - 1.85 * us, ux[1] - 1.15 * us], [ux[0] - 1.95 * us, ux[1]]], '#39424c');
    S.poly([[ux[0] - 1.5 * us, ux[1] - 0.80 * us], [ux[0] + 1.2 * us, ux[1] - 0.80 * us], [ux[0] + 1.2 * us, ux[1] - 1.28 * us], [ux[0] - 1.35 * us, ux[1] - 1.28 * us]], '#4d5866');
    ctx.strokeStyle = 'rgba(255,206,150,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ux[0] - 1.45 * us, ux[1] - 0.82 * us); ctx.lineTo(ux[0] + 1.22 * us, ux[1] - 0.82 * us); ctx.stroke();

    /* ---------- VEGETATION: Barossa vineyard/gum tree hints on left ---------- */
    if (t5 > 0.2) {
      /* gum trees left side */
      for (var gt = 0; gt < 4; gt++) {
        var gz = 8 + gt * 4, gx = -8.5 + (gt % 2) * 1.2;
        var gb = S.project(gx, 0, gz), gs = S.focal / gz;
        S.shadow(gx, gz, 0.6, 0.6, .3);
        /* trunk */
        ctx.strokeStyle = PS.rgba('#3d2e1f', .8); ctx.lineWidth = 2.2 * gs;
        ctx.beginPath(); ctx.moveTo(gb[0], gb[1]); ctx.lineTo(gb[0], gb[1] - 2.8 * gs); ctx.stroke();
        /* canopy */
        ctx.fillStyle = PS.rgba(PLANT_GREEN, .6);
        ctx.beginPath(); ctx.arc(gb[0], gb[1] - 2.8 * gs, 1.8 * gs, 0, 6.2832); ctx.fill();
        ctx.fillStyle = PS.rgba(PLANT_DARK, .4);
        ctx.beginPath(); ctx.arc(gb[0] - 0.3 * gs, gb[1] - 3.2 * gs, 1.2 * gs, 0, 6.2832); ctx.fill();
      }
    }

    /* ---------- CAR DRIVES ON (stage 5) ---------- */
    if (t5 > 0) {
      var carProgress = PS.ease.out(PS.clamp(t5 / 0.8, 0, 1));
      var carZ = Z1 + 2.5 - carProgress * (Z1 - Z0 + 5.5);
      var carX = 0;
      car(S, carX, carZ, CAR_BODY, CAR_WINDOW, TIRE, 1.0);
      /* tire tracks on cured concrete */
      if (t5 > 0.4) {
        var trackAlpha = PS.clamp((t5 - 0.4) / 0.6, 0, 1) * 0.15;
        ctx.save(); ctx.globalAlpha = trackAlpha; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.2;
        for (var tr = 0; tr < 2; tr++) {
          var tx = tr === 0 ? -0.7 : 0.7;
          for (var tz = Z1 + 2; tz > Z0 - 1; tz -= 0.8) {
            var tp1 = S.project(tx, SLAB + 0.01, tz + 0.4), tp2 = S.project(tx, SLAB + 0.01, tz - 0.4);
            ctx.beginPath(); ctx.moveTo(tp1[0], tp1[1]); ctx.lineTo(tp2[0], tp2[1]); ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    /* ---------- ATMOSPHERE + GRADE ---------- */
    S.scaleCue(-7.4, Z0 + 4.4, 'person');
    S.dust(34, time);
    var rim = ctx.createLinearGradient(0, 0, W, H);
    rim.addColorStop(0, 'rgba(255,196,138,.06)'); rim.addColorStop(0.5, 'rgba(255,196,138,0)'); rim.addColorStop(1, 'rgba(60,90,120,.05)');
    ctx.fillStyle = rim; ctx.fillRect(0, 0, W, H);
    S.grade();

    /* ---------- HUD update ---------- */
    var idx = p < 0.18 ? 0 : p < 0.38 ? 1 : p < 0.70 ? 2 : p < 0.90 ? 3 : 4;
    if (stgNum && stgNum.textContent !== NAMES[idx][0]) stgNum.textContent = NAMES[idx][0];
    if (stgName && stgName.textContent !== NAMES[idx][1]) stgName.textContent = NAMES[idx][1];
  }

  S.start();
})();