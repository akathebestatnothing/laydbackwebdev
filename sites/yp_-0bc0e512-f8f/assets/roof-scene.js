/* Roof scene: corrugated metal sheeting seen from the eave, ridge capping,
   gutter and downpipe, distant rooflines. Perspective is real (pinhole), so
   sheets converge and recede instead of sitting flat. Builds on once, then holds. */
(function () {
  var cv = document.getElementById('heroCanvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1, focal = 900, horizon = 0, camX = 0, camY = 1.62;
  var start = (window.performance && performance.now ? performance.now() : Date.now());
  var raf = null, visible = true;

  var SKY0 = '#05070d', SKY1 = '#0b1120', SKY2 = '#1b2542';
  var METAL = '#5d6a95', METAL_D = '#2b3450', RIB = '#8490b8', RIDGE = '#98a3c8';
  var GUTTER = '#1d2740', PIPE = '#2a3550', GROUND = '#090d15', SILH = '#0f1728', SUN = '#f2dcb4';

  function rgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(a, b, k) {
    var A = rgb(a), B = rgb(b), o = '#';
    for (var i = 0; i < 3; i++) o += ('0' + Math.round(A[i] + (B[i] - A[i]) * k).toString(16)).slice(-2);
    return o;
  }
  function fog(z) { return Math.max(0, Math.min(1, (z - 9) / 52)) * 0.8; }
  function ease(k) { k = k < 0 ? 0 : k > 1 ? 1 : k; return 1 - Math.pow(1 - k, 3); }

  function size() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, Math.round(r.width || cv.clientWidth || window.innerWidth));
    H = Math.max(240, Math.round(r.height || cv.clientHeight || window.innerHeight));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    focal = H * 1.12;
    horizon = H * 0.60;
  }

  function px(x, y, z) {
    if (z < 0.45) return null;
    return [W * 0.5 + (x - camX) * focal / z, horizon - (y - camY) * focal / z];
  }

  function quad(pts, tone, alpha) {
    var m = [], sum = 0, zs = 0, p;
    for (var i = 0; i < pts.length; i++) {
      p = px(pts[i][0], pts[i][1], pts[i][2]);
      if (!p) return;
      m.push(p); sum += pts[i][2]; zs++;
    }
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = mix(tone, SKY2, fog(sum / zs));
    ctx.beginPath();
    ctx.moveTo(m[0][0], m[0][1]);
    for (var j = 1; j < m.length; j++) ctx.lineTo(m[j][0], m[j][1]);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function line(a, b, tone, w) {
    var p = px(a[0], a[1], a[2]), q = px(b[0], b[1], b[2]);
    if (!p || !q) return;
    ctx.strokeStyle = mix(tone, SKY2, fog((a[2] + b[2]) / 2));
    ctx.lineWidth = w || 1;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }

  function sky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, SKY0);
    g.addColorStop(0.52, SKY1);
    g.addColorStop(1, SKY2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // low sun haze behind the roofline
    var s = px(-9, 1.4, 120) || [W * 0.34, horizon];
    var rg = ctx.createRadialGradient(s[0], horizon, 0, s[0], horizon, Math.max(W, H) * 0.55);
    rg.addColorStop(0, 'rgba(242,220,180,.26)');
    rg.addColorStop(0.45, 'rgba(214,186,150,.09)');
    rg.addColorStop(1, 'rgba(214,186,150,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  function ground() {
    quad([[-46, 0, 6], [50, 0, 6], [50, 0, 64], [-46, 0, 64]], GROUND, 1);
  }

  function silhouettes() {
    var gables = [[-27, 9, 58, 4.4], [-16, 11, 52, 3.4], [-4, 8, 62, 5.1]];
    for (var i = 0; i < gables.length; i++) {
      var g = gables[i];
      quad([[g[0], 0, g[2]], [g[0] + g[1], 0, g[2]], [g[0] + g[1] * 0.5, g[3], g[2]]], SILH, 0.95);
      quad([[g[0] + g[1] * 0.5, g[3], g[2]], [g[0] + g[1] * 0.5, 0, g[2]], [g[0] + g[1] * 0.5 + g[1], 0, g[2]]], SILH, 0.6);
    }
  }

  var X0 = 1.5, X1 = 18, ZE = 5.6, ZR = 37, YE = 2.03, YR = 8.6, BW = 0.34;
  var bays = Math.round((X1 - X0) / BW);

  function roof(t) {
    var i, x0, x1, k, zf, yf;
    for (i = 0; i < bays; i++) {
      x0 = X0 + i * BW;
      x1 = x0 + BW;
      k = ease((t - (0.05 + i * 0.038)) / 0.55);
      if (k <= 0) continue;
      zf = ZE + (ZR - ZE) * k;
      yf = YE + (YR - YE) * k;
      quad([[x0, YE, ZE], [x1, YE, ZE], [x1, yf, zf], [x0, yf, zf]], i % 2 ? METAL_D : METAL, 1);
      line([x1, YE, ZE], [x1, yf, zf], RIB, Math.max(1, 1.6 - i * 0.02));
      if (i % 2 === 0) line([x0, YE, ZE], [x0, yf, zf], RIB, 1);
      // fixings along the near sheets
      if (i % 4 === 0) {
        var ss = [0.17, 0.36, 0.55, 0.74, 0.9];
        for (var j = 0; j < ss.length; j++) {
          if (ss[j] > k) continue;
          var sy = YE + (YR - YE) * ss[j], sz = ZE + (ZR - ZE) * ss[j];
          quad([[x1 - 0.05, sy, sz], [x1 + 0.05, sy, sz], [x1 + 0.05, sy + 0.05, sz], [x1 - 0.05, sy + 0.05, sz]], '#cfd7ee', 0.5);
        }
      }
    }
    // ridge capping across the top
    var kr = ease((t - 1.5) / 0.7);
    if (kr > 0) {
      quad([[X0, YR, ZR], [X0 + (X1 - X0) * kr, YR, ZR],
            [X0 + (X1 - X0) * kr, YR + 0.24, ZR + 0.06], [X0, YR + 0.24, ZR + 0.06]], RIDGE, 1);
      line([X0, YR + 0.24, ZR], [X0 + (X1 - X0) * kr, YR + 0.24, ZR], '#b9c2e0', 1.2);
    }
  }

  function eave() {
    var k = ease((performance.now() - start) / 1000 - 0.2);
    if (k <= 0) return;
    var xe = X0 + (X1 - X0) * Math.min(1, k);
    quad([[X0, YE - 0.18, ZE - 0.16], [xe, YE - 0.18, ZE - 0.16],
          [xe, YE + 0.01, ZE - 0.16], [X0, YE + 0.01, ZE - 0.16]], GUTTER, 1);
    quad([[X0, YE - 0.34, ZE - 0.1], [xe, YE - 0.34, ZE - 0.1],
          [xe, YE - 0.18, ZE - 0.1], [X0, YE - 0.18, ZE - 0.1]], '#2f3b5c', 1);
    line([X0, YE - 0.34, ZE - 0.1], [xe, YE - 0.34, ZE - 0.1], '#7c88ad', 1.4);
  }

  function downpipe() {
    quad([[1.86, 0.25, 5.9], [2.14, 0.25, 5.9], [2.14, YE - 0.3, 5.9], [1.86, YE - 0.3, 5.9]], PIPE, 1);
    line([1.86, 0.25, 5.9], [1.86, YE - 0.3, 5.9], '#6c7899', 1.3);
  }

  function scrim() {
    var g = ctx.createLinearGradient(0, 0, W * 0.74, H * 0.2);
    g.addColorStop(0, 'rgba(5,7,13,.88)');
    g.addColorStop(0.55, 'rgba(5,7,13,.42)');
    g.addColorStop(1, 'rgba(5,7,13,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var v = ctx.createRadialGradient(W * 0.55, H * 0.5, Math.min(W, H) * 0.3, W * 0.55, H * 0.5, Math.max(W, H) * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function draw(ms) {
    var t = (ms - start) / 1000;
    if (reduce) t = 99;
    camX = 0.26 * Math.sin(t * 0.14);
    camY = 1.62 + 0.02 * Math.sin(t * 0.21);
    sky();
    ground();
    silhouettes();
    roof(t);
    eave();
    downpipe();
    scrim();
  }

  function loop(ms) {
    if (visible) draw(ms || performance.now());
    raf = requestAnimationFrame(loop);
  }

  size();
  draw(performance.now());
  window.addEventListener('resize', function () {
    size();
    draw(performance.now());
  });
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
  }
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden && document.visibilityState === 'visible';
  });
  if (!reduce) raf = requestAnimationFrame(loop);
})();
