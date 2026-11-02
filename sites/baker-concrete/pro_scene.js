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
