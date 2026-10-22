/* Pacific Car Care — hero scene: gloss panel, wheel and spokes, suds running, polish sheen.
   Canvas 2D, deterministic, DPR aware, static under prefers-reduced-motion. */
(function () {
  var cv = document.getElementById('heroCanvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 1, H = 1, dpr = 1, t = 0, raf = null, live = true;

  var GOLD = [255, 196, 0], RED = [229, 35, 36], WHITE = [255, 255, 255];

  var seed = 9917;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

  var suds = [], beads = [];
  function build() {
    suds = []; beads = [];
    for (var i = 0; i < 26; i++) {
      suds.push({
        x: 0.40 + rnd() * 0.58,
        y: rnd(),
        r: 3 + rnd() * 9,
        sp: 0.10 + rnd() * 0.42,
        wob: rnd() * 6.28,
        a: 0.30 + rnd() * 0.5
      });
    }
    for (var j = 0; j < 44; j++) {
      beads.push({ x: 0.42 + rnd() * 0.56, y: 0.34 + rnd() * 0.48, r: 1 + rnd() * 2.6, a: 0.18 + rnd() * 0.5 });
    }
  }

  function size() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(360, Math.round(r.width || window.innerWidth));
    H = Math.max(300, Math.round(r.height || 620));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function panelPath() {
    var p = new Path2D();
    p.moveTo(W * 0.30, H * 0.86);
    p.bezierCurveTo(W * 0.36, H * 0.60, W * 0.52, H * 0.40, W * 0.80, H * 0.33);
    p.bezierCurveTo(W * 0.94, H * 0.30, W * 1.03, H * 0.33, W * 1.06, H * 0.37);
    p.lineTo(W * 1.06, H * 0.92);
    p.lineTo(W * 0.30, H * 0.92);
    p.closePath();
    return p;
  }

  function wheel(cx, cy, R, ang) {
    // tyre
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832);
    ctx.fillStyle = '#08080a'; ctx.fill();
    ctx.lineWidth = Math.max(2, R * 0.03);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.stroke();

    // sidewall lettering ring
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, 6.2832);
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = Math.max(1, R * 0.014); ctx.stroke();

    // rim dish
    var rg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rg.addColorStop(0, '#3b3b40'); rg.addColorStop(0.45, '#1b1b1f'); rg.addColorStop(1, '#0f0f11');
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.76, 0, 6.2832); ctx.fillStyle = rg; ctx.fill();

    // brake disc glow behind spokes
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, 0, 6.2832);
    ctx.fillStyle = 'rgba(120,118,112,.30)'; ctx.fill();

    // spokes
    var n = 7;
    for (var i = 0; i < n; i++) {
      var a = ang + (i * 6.2832) / n;
      var a2 = a + 0.20;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R * 0.20, cy + Math.sin(a) * R * 0.20);
      ctx.quadraticCurveTo(
        cx + Math.cos(a + 0.12) * R * 0.50, cy + Math.sin(a + 0.12) * R * 0.50,
        cx + Math.cos(a2) * R * 0.71, cy + Math.sin(a2) * R * 0.71
      );
      ctx.lineWidth = R * 0.135;
      ctx.strokeStyle = 'rgba(206,208,214,.52)';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineWidth = R * 0.05;
      ctx.strokeStyle = 'rgba(255,240,205,.42)';
      ctx.stroke();
    }

    // hub
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.19, 0, 6.2832);
    var hg = ctx.createLinearGradient(cx - R * 0.2, cy - R * 0.2, cx + R * 0.2, cy + R * 0.2);
    hg.addColorStop(0, '#ffe06a'); hg.addColorStop(1, '#c98f00');
    ctx.fillStyle = hg; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.06, 0, 6.2832); ctx.fillStyle = '#141416'; ctx.fill();
  }

  function draw() {
    var panel = panelPath();

    // garage
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0a0b');
    bg.addColorStop(0.55, '#141416');
    bg.addColorStop(1, '#0b0b0c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // warm key light, top right
    var key = ctx.createRadialGradient(W * 0.86, H * 0.12, 0, W * 0.86, H * 0.12, Math.max(W, H) * 0.72);
    key.addColorStop(0, 'rgba(255,196,0,.20)');
    key.addColorStop(0.45, 'rgba(255,196,0,.06)');
    key.addColorStop(1, 'rgba(255,196,0,0)');
    ctx.fillStyle = key; ctx.fillRect(0, 0, W, H);

    // floor line + reflection pool
    var fl = ctx.createLinearGradient(0, H * 0.80, 0, H);
    fl.addColorStop(0, 'rgba(255,255,255,.02)');
    fl.addColorStop(1, 'rgba(255,255,255,.09)');
    ctx.fillStyle = fl; ctx.fillRect(0, H * 0.80, W, H * 0.20);

    // body panel
    var paint = ctx.createLinearGradient(W * 0.34, H * 0.30, W * 0.96, H * 0.94);
    paint.addColorStop(0, '#26262b');
    paint.addColorStop(0.35, '#101013');
    paint.addColorStop(0.62, '#1d1d21');
    paint.addColorStop(1, '#08080a');
    ctx.save(); ctx.clip(panel);
    ctx.fillStyle = paint; ctx.fillRect(0, 0, W, H);

    // fixed reflection bands in the clearcoat
    var bands = [[0.36, 0.055, 0.13], [0.455, 0.020, 0.22], [0.60, 0.085, 0.09], [0.755, 0.030, 0.16]];
    for (var b = 0; b < bands.length; b++) {
      var by = H * bands[b][0], bh = H * bands[b][1];
      var lg = ctx.createLinearGradient(0, by, 0, by + bh);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,' + bands[b][2] + ')');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(W * 0.28, by, W * 0.80, bh);
    }

    // travelling polish sheen
    var sweep = (t * 0.00006) % 1.6 - 0.3;
    var sx = W * (0.30 + sweep * 0.72);
    var sg = ctx.createLinearGradient(sx - W * 0.16, H * 0.28, sx + W * 0.16, H * 0.96);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.42, 'rgba(255,255,255,.13)');
    sg.addColorStop(0.5, 'rgba(255,244,214,.30)');
    sg.addColorStop(0.58, 'rgba(255,255,255,.12)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);

    // suds running down the panel
    for (var s = 0; s < suds.length; s++) {
      var d = suds[s];
      var dy = ((d.y + t * 0.000021 * d.sp) % 1);
      var px = (d.x + 0.012 * Math.sin(t * 0.0006 + d.wob)) * W;
      var py = (0.26 + dy * 0.62) * H;
      var trail = ctx.createLinearGradient(px, py - d.r * 5, px, py + d.r);
      trail.addColorStop(0, 'rgba(255,255,255,0)');
      trail.addColorStop(1, 'rgba(255,255,255,' + (d.a * 0.30).toFixed(3) + ')');
      ctx.strokeStyle = trail;
      ctx.lineWidth = d.r * 0.55;
      ctx.beginPath(); ctx.moveTo(px, py - d.r * 5); ctx.lineTo(px, py); ctx.stroke();

      ctx.beginPath(); ctx.arc(px, py, d.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,' + d.a.toFixed(3) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(px - d.r * 0.28, py - d.r * 0.30, d.r * 0.46, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px + d.r * 0.34, py + d.r * 0.22, d.r * 0.16, 0, 6.2832);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fill();
    }

    // water beads
    for (var q = 0; q < beads.length; q++) {
      var bd = beads[q];
      ctx.beginPath(); ctx.arc(bd.x * W, bd.y * H, bd.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,' + bd.a.toFixed(2) + ')'; ctx.fill();
    }

    // gloss edge along the panel shoulder
    ctx.beginPath();
    ctx.moveTo(W * 0.30, H * 0.86);
    ctx.bezierCurveTo(W * 0.36, H * 0.60, W * 0.52, H * 0.40, W * 0.80, H * 0.33);
    ctx.bezierCurveTo(W * 0.94, H * 0.30, W * 1.03, H * 0.33, W * 1.06, H * 0.37);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,220,120,.55)'; ctx.stroke();
    ctx.restore();

    // wheel + spokes, rotating
    var R = Math.min(W, H) * 0.155;
    wheel(W * 0.80, H * 0.795, R, t * 0.00035);
    ctx.beginPath(); ctx.ellipse(W * 0.80, H * 0.955, R * 1.05, R * 0.16, 0, 0, 6.2832);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();

    // left scrim for the headline
    var sc = ctx.createLinearGradient(0, 0, W * 0.62, 0);
    sc.addColorStop(0, 'rgba(6,6,7,.94)');
    sc.addColorStop(0.62, 'rgba(6,6,7,.80)');
    sc.addColorStop(1, 'rgba(6,6,7,0)');
    ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);

    // red rim light, bottom left
    var rl = ctx.createLinearGradient(0, H, W * 0.55, H * 0.55);
    rl.addColorStop(0, 'rgba(229,35,36,.17)');
    rl.addColorStop(1, 'rgba(229,35,36,0)');
    ctx.fillStyle = rl; ctx.fillRect(0, 0, W, H);
  }

  function loop(ts) {
    t = ts || 0;
    if (live) draw();
    raf = requestAnimationFrame(loop);
  }

  size(); build(); draw();
  window.addEventListener('resize', function () {
    size(); build();
    if (reduce) draw();
  });
  if (!reduce) {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', function () {
      live = !document.hidden && document.visibilityState === 'visible';
    });
  }
})();
