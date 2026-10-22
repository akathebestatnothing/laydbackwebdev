/* Lego Bin hero scene — skip bin yard, dusk.
   World-space faces through one pinhole projection (assets/heroCanvas.js):
   gravel apron, hook-lift skip bin loaded with rubble, wheelbarrow and sand,
   shovel, brick stack, cones, corrugated yard fence and two bins deep in haze. */
(function () {
  var cv = document.getElementById('scene');
  if (!cv || !window.Projection) return;
  var P = Projection, mix = P.mix;
  var FOG = '#101620';
  var S = P.create(cv, { focal: 1.15, horizon: 0.52, camY: 1.55, fogNear: 8, fogFar: 48, fogCol: FOG });
  var ctx = S.ctx;

  var T = {
    gravel: '#3a3f46', gravel2: '#474d55', rut: '#2a2e34', kerb: '#6b7279',
    fence: '#202931', fenceHi: '#3a444e', post: '#4a545e',
    bin: '#c0333a', binD: '#8f262c', binL: '#d84c51', rail: '#262c32',
    rubble: '#5b5348', rubble2: '#6b6155', brick: '#8c4a3b', brick2: '#6d4034',
    plaster: '#cfc6b6', timber: '#9c7446', timberD: '#79562f',
    steel: '#b7c1c8', steelD: '#78838a',
    barrow: '#2e5f7c', barrowD: '#21465d',
    sand: '#b39468', sandD: '#94784e',
    cone: '#cf4f2b', coneW: '#e7e0d4',
    shadow: '#05070a', sky: '#5b9ae0'
  };

  var faces = [];
  var seed = 90210;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function face(pts, col, n, t0) { faces.push({ p: pts, c: col, n: n || [0, 1, 0], t: t0 || 0 }); }

  /* one sun, upper left, in front of the camera */
  var L = (function () { var v = [-0.56, 0.74, -0.38], m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; })();
  function sh(col, k) { return k >= 1 ? mix(col, '#f2f6fa', (k - 1) * 0.5) : mix(col, '#060b11', (1 - k) * 0.55); }

  function box(cx, cy, cz, w, h, d, col, t0) {
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy, y1 = cy + h, z0 = cz - d / 2, z1 = cz + d / 2;
    face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], sh(col, 1), [0, 0, 1], t0);
    face([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], sh(col, 0.7), [0, 0, -1], t0);
    face([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], sh(col, 0.86), [1, 0, 0], t0);
    face([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], sh(col, 1.1), [-1, 0, 0], t0);
    face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], sh(col, 1.16), [0, 1, 0], t0);
  }

  /* ground: gravel apron with wheel ruts and loose stone */
  function ground() {
    var z, x, i;
    for (z = 1.1; z < 34; z += 0.42) {
      var n = Math.round((z - 1.1) / 0.42);
      face([[-15, 0, z], [15, 0, z], [15, 0, z + 0.42], [-15, 0, z + 0.42]],
        n % 2 ? T.gravel : T.gravel2, [0, 1, 0], 0);
    }
    for (i = 0; i < 5; i++) {
      var rx = -3.4 + i * 1.65;
      face([[rx - 0.16, 0.004, 1.2], [rx + 0.16, 0.004, 1.2], [rx + 0.44, 0.004, 15], [rx + 0.12, 0.004, 15]], T.rut, [0, 1, 0], 0.02);
    }
    for (i = 0; i < 90; i++) {
      var sx = -12 + rnd() * 24, sz = 1.6 + rnd() * 15, sr = 0.04 + rnd() * 0.15;
      face([[sx, 0.005, sz], [sx + sr, 0.005, sz], [sx + sr, 0.005, sz + sr], [sx, 0.005, sz + sr]],
        rnd() > 0.55 ? '#5d646c' : '#33383e', [0, 1, 0], 0.05);
    }
    /* kerb line so the yard has an edge */
    box(9.6, 0, 3, 0.34, 0.22, 26, T.kerb, 0.04);
    box(-9.6, 0, 3, 0.34, 0.22, 26, T.kerb, 0.04);
  }

  /* yard hoarding, corrugated, boards fading into haze */
  function fence() {
    var z = 16.5, x;
    face([[-14, 0, z], [14, 0, z], [14, 2.9, z], [-14, 2.9, z]], T.fence, [0, 0, -1], 0.06);
    for (x = -13.8; x < 14; x += 0.34) {
      face([[x, 0, z - 0.01], [x + 0.13, 0, z - 0.01], [x + 0.13, 2.9, z - 0.01], [x, 2.9, z - 0.01]],
        rnd() > 0.5 ? T.fenceHi : '#2a333c', [0, 0, -1], 0.08);
    }
    for (x = -13; x <= 13; x += 4.4) box(x, 0, z + 0.18, 0.16, 3.05, 0.16, T.post, 0.07);
    box(0, 2.86, z + 0.1, 28, 0.1, 0.26, '#57626c', 0.07);
  }

  /* the skip bin: tapered body, ribbed panels, black top rail, open mouth */
  var BX = 1.7, BZ = 5.7, BT = 1.62, BB = 1.18, BH = 1.32, BW = 3.0, BW2 = 2.66;
  function bin() {
    var yb = 0, yt = BH;
    var nz = BZ + BT / 2, fz = BZ - BT / 2, nbz = BZ + BB / 2, fbz = BZ - BB / 2;
    var xl = BX - BW / 2, xr = BX + BW / 2, xlb = BX - BW2 / 2, xrb = BX + BW2 / 2;

    /* contact shadow */
    face([[xl - 0.4, 0.006, nbz + 0.35], [xr + 0.4, 0.006, nbz + 0.35], [xr + 0.15, 0.006, fbz - 1.5], [xl - 0.15, 0.006, fbz - 1.5]], T.shadow, [0, 1, 0], 0.1);

    /* near panel */
    face([[xlb, yb, nbz], [xrb, yb, nbz], [xr, yt, nz], [xl, yt, nz]], T.bin, [0, 0, 1], 0.34);
    /* far panel, inside face visible above the load */
    face([[xlb, yb, fbz], [xrb, yb, fbz], [xr, yt, fz], [xl, yt, fz]], sh(T.binD, 0.9), [0, 0, -1], 0.34);
    face([[xl, yt, fz], [xr, yt, fz], [xr, yt - 0.62, fz + 0.09], [xl, yt - 0.62, fz + 0.09]], sh(T.binD, 0.62), [0, 0, 1], 0.4);
    /* end panels */
    face([[xrb, yb, fbz], [xrb, yb, nbz], [xr, yt, nz], [xr, yt, fz]], sh(T.bin, 0.82), [1, 0, 0], 0.34);
    face([[xlb, yb, nbz], [xlb, yb, fbz], [xl, yt, fz], [xl, yt, nz]], sh(T.bin, 1.12), [-1, 0, 0], 0.34);
    /* ribs on the near panel */
    for (var i = 0; i < 5; i++) {
      var rx = xl + 0.34 + i * ((BW - 0.68) / 4);
      var rxb = rx + (xlb - xl) * 0.5 + (xr - xl) * 0.0;
      face([[rx, yt, nz + 0.012], [rx + 0.12, yt, nz + 0.012], [rxb + 0.12, yb, nbz + 0.012], [rxb, yb, nbz + 0.012]],
        sh(T.binD, 0.92), [0, 0, 1], 0.44 + i * 0.03);
    }
    /* top rail */
    box(BX, yt, nz, BW + 0.1, 0.1, 0.14, T.rail, 0.5);
    box(BX, yt, fz, BW + 0.1, 0.1, 0.14, T.rail, 0.5);
    box(xl, yt, BZ, 0.14, 0.1, BT + 0.1, T.rail, 0.5);
    box(xr, yt, BZ, 0.14, 0.1, BT + 0.1, T.rail, 0.5);
    /* lifting lugs */
    box(xl + 0.3, yt + 0.1, nz, 0.2, 0.16, 0.1, T.rail, 0.56);
    box(xr - 0.3, yt + 0.1, nz, 0.2, 0.16, 0.1, T.rail, 0.56);
  }

  /* rubble heaped over the rim: broken brick, plasterboard, timber offcuts */
  function load() {
    var yt = BH, i;
    for (i = 0; i < 26; i++) {
      var lx = BX - BW / 2 + 0.18 + rnd() * (BW - 0.36);
      var lz = BZ - BT / 2 + 0.2 + rnd() * (BT - 0.4);
      var h = yt + 0.04 + rnd() * 0.42;
      var w = 0.16 + rnd() * 0.3;
      var tone = rnd() > 0.5 ? T.brick : (rnd() > 0.5 ? T.rubble : T.rubble2);
      face([[lx - w, yt - 0.06, lz], [lx + w, yt - 0.06, lz], [lx + w * 0.8, h, lz + 0.06], [lx - w * 0.8, h, lz + 0.06]],
        sh(tone, 0.9 + rnd() * 0.35), [0, 0, 1], 0.68 + rnd() * 0.5);
    }
    /* two sheets of plasterboard sticking out of the load */
    face([[BX - 1.0, yt - 0.1, BZ + 0.35], [BX - 0.34, yt - 0.1, BZ + 0.3], [BX - 0.16, yt + 0.86, BZ + 0.02], [BX - 0.82, yt + 0.94, BZ + 0.06]],
      sh(T.plaster, 1.06), [0, 0, 1], 0.96);
    face([[BX + 0.16, yt + 0.62, BZ - 0.1], [BX + 0.7, yt + 0.5, BZ - 0.16], [BX + 0.86, yt + 1.04, BZ - 0.3], [BX + 0.34, yt + 1.1, BZ - 0.24]],
      sh(T.plaster, 0.9), [0, 0, 1], 1.02);
    /* timber offcut out over the near rail */
    face([[BX + 0.5, yt + 0.1, BZ + 0.5], [BX + 0.62, yt + 0.06, BZ + 0.5], [BX + 1.5, yt + 0.5, BZ + 1.15], [BX + 1.38, yt + 0.56, BZ + 1.15]],
      sh(T.timber, 1.08), [0, 0, 1], 1.1);
    /* bent steel pipe over the end */
    box(BX - 1.28, BH + 0.16, BZ + 0.2, 0.06, 0.06, 1.4, T.steelD, 1.14);
  }

  /* wheelbarrow with a sand heap */
  function barrow() {
    var x = 3.85, z = 4.5;
    face([[x - 0.62, 0.02, z + 0.62], [x + 0.62, 0.02, z + 0.62], [x + 0.5, 0.02, z - 0.5], [x - 0.5, 0.02, z - 0.5]], T.shadow, [0, 1, 0], 0.9);
    face([[x - 0.44, 0.34, z + 0.5], [x + 0.44, 0.34, z + 0.5], [x + 0.34, 0.34, z - 0.42], [x - 0.34, 0.34, z - 0.42]], T.sand, [0, 1, 0], 0.95);
    /* tray: sides and floor of the barrow pan */
    face([[x - 0.5, 0.62, z + 0.58], [x + 0.5, 0.62, z + 0.58], [x + 0.4, 0.28, z + 0.48], [x - 0.4, 0.28, z + 0.48]], T.barrow, [0, 0, 1], 1.0);
    face([[x + 0.5, 0.62, z + 0.58], [x + 0.52, 0.62, z - 0.4], [x + 0.42, 0.28, z - 0.34], [x + 0.4, 0.28, z + 0.48]], T.barrowD, [1, 0, 0], 1.0);
    face([[x - 0.5, 0.62, z + 0.58], [x - 0.52, 0.62, z - 0.4], [x - 0.42, 0.28, z - 0.34], [x - 0.4, 0.28, z + 0.48]], sh(T.barrow, 1.1), [-1, 0, 0], 1.0);
    face([[x - 0.52, 0.62, z - 0.4], [x + 0.52, 0.62, z - 0.4], [x + 0.42, 0.28, z - 0.34], [x - 0.42, 0.28, z - 0.34]], T.barrowD, [0, 0, -1], 1.0);
    /* sand heap over the rim */
    for (var i = 0; i < 6; i++) {
      var sx = x - 0.36 + i * 0.14, sh2 = 0.72 + Math.sin(i / 6 * Math.PI) * 0.18;
      face([[sx - 0.09, 0.62, z + 0.36], [sx + 0.09, 0.62, z + 0.36], [sx + 0.05, sh2, z + 0.2], [sx - 0.06, sh2, z + 0.2]],
        sh(i % 2 ? T.sand : T.sandD, 1.06), [0, 0, 1], 1.06 + i * 0.02);
    }
    /* legs, axle, wheel, handles */
    box(x + 0.1, 0, z - 0.42, 0.07, 0.62, 0.07, T.steelD, 1.05);
    box(x - 0.1, 0, z - 0.42, 0.07, 0.62, 0.07, T.steelD, 1.05);
    box(x, 0.06, z + 0.7, 0.5, 0.06, 0.06, T.steelD, 1.05);
    var wheel = [], r = 0.26, seg = 18;
    for (var n = 0; n < seg; n++) { var a = n / seg * 6.2832; wheel.push([x + Math.cos(a) * r, 0.26 + Math.sin(a) * r, z + 0.72]); }
    face(wheel, '#1a1e22', [0, 0, 1], 1.08);
    face(wheel.map(function (p) { return [p[0] * 0.98 + x * 0.02, p[1], p[2] + 0.02]; }), '#2b3035', [0, 0, 1], 1.12);
    box(x + 0.5, 0.6, z - 0.1, 0.5, 0.05, 0.05, T.timber, 1.1);
    box(x - 0.5, 0.6, z - 0.1, 0.5, 0.05, 0.05, T.timber, 1.1);
  }

  /* sand pile with a shovel standing in it */
  function pile() {
    var x = 0.55, z = 3.5;
    for (var i = 0; i < 7; i++) {
      var a = (i / 7) * 6.2832, r = 0.5;
      face([[x + Math.cos(a) * r, 0.002, z + Math.sin(a) * r], [x + Math.cos(a + 0.9) * r, 0.002, z + Math.sin(a + 0.9) * r],
        [x + Math.cos(a + 0.45) * 0.14, 0.32 + Math.sin(i) * 0.03, z + Math.sin(a + 0.45) * 0.14]],
        sh(i % 2 ? T.sand : T.sandD, 0.95 + (i % 3) * 0.08), [Math.cos(a), 0.6, Math.sin(a)], 1.2 + i * 0.03);
    }
    /* shovel: blade in the sand, shaft leaning back */
    face([[x - 0.13, 0.2, z + 0.06], [x + 0.13, 0.2, z + 0.06], [x + 0.09, 0.56, z + 0.03], [x - 0.09, 0.56, z + 0.03]], sh(T.steel, 1.1), [0, 0, 1], 1.42);
    box(x, 0.56, z + 0.04, 0.035, 0.72, 0.035, T.timber, 1.5);
    box(x, 1.26, z + 0.02, 0.19, 0.03, 0.03, T.timberD, 1.56);
  }

  /* brick stack on a pallet, and a cone line */
  function bricks() {
    var x = 4.95, z = 6.4, i, c, r;
    for (i = 0; i < 4; i++) box(x + (i - 1.5) * 0.24, 0, z, 0.2, 0.11, 1.0, T.timberD, 1.0);
    for (c = 0; c < 3; c++) {
      for (r = 0; r < 3; r++) {
        box(x - 0.3 + r * 0.3 + (c % 2) * 0.06, 0.12 + c * 0.16, z, 0.26, 0.15, 0.62,
          rnd() > 0.4 ? T.brick : T.brick2, 1.06 + c * 0.06 + r * 0.02);
      }
    }
  }

  function cone(x, z, t0) {
    var w = 0.17;
    face([[x - w, 0, z + 0.1], [x + w, 0, z + 0.1], [x + 0.03, 0.58, z], [x - 0.03, 0.58, z]], sh(T.cone, 1.0), [0, 0, 1], t0);
    face([[x - w, 0, z + 0.1], [x - 0.03, 0.58, z], [x - 0.02, 0.58, z + 0.02], [x - w * 0.8, 0, z + 0.16]], sh(T.cone, 1.12), [-1, 0, 0], t0);
    face([[x + w, 0, z + 0.1], [x + 0.03, 0.58, z], [x + 0.02, 0.58, z + 0.02], [x + w * 0.8, 0, z + 0.16]], sh(T.cone, 0.8), [1, 0, 0], t0);
    face([[x - w * 0.72, 0.16, z + 0.08], [x + w * 0.72, 0.16, z + 0.08], [x + w * 0.55, 0.26, z + 0.06], [x - w * 0.55, 0.26, z + 0.06]], T.coneW, [0, 0, 1], t0 + 0.05);
    box(x, 0, z + 0.1, w * 2.4, 0.04, 0.32, '#23282d', t0);
  }

  /* two more bins deep in the yard, mostly haze */
  function farBin(x, z, s) {
    var yt = 1.2 * s;
    face([[x - 0.75 * s, 0, z + 0.4 * s], [x + 0.75 * s, 0, z + 0.4 * s], [x + 0.88 * s, yt, z + 0.52 * s], [x - 0.88 * s, yt, z + 0.52 * s]], T.bin, [0, 0, 1], 0.6);
    face([[x - 0.88 * s, yt, z + 0.52 * s], [x + 0.88 * s, yt, z + 0.52 * s], [x + 0.8 * s, yt - 0.1, z + 0.5 * s], [x - 0.8 * s, yt - 0.1, z + 0.5 * s]], T.rail, [0, 1, 0], 0.62);
    face([[x - 0.5 * s, yt, z + 0.4 * s], [x + 0.5 * s, yt, z + 0.4 * s], [x + 0.4 * s, yt + 0.2 * s, z + 0.4 * s], [x - 0.4 * s, yt + 0.2 * s, z + 0.4 * s]], T.rubble, [0, 0, 1], 0.66);
  }

  var dust = [];
  for (var d = 0; d < 26; d++) dust.push({ x: -6 + rnd() * 14, y: 0.3 + rnd() * 2.4, z: 2 + rnd() * 14, p: rnd() * 6.283, s: 0.5 + rnd() });

  function draw(time) {
    var sky = ctx.createLinearGradient(0, 0, 0, S.H);
    sky.addColorStop(0, '#070a10');
    sky.addColorStop(0.34, '#0d1620');
    sky.addColorStop(0.55, '#16242f');
    sky.addColorStop(0.78, '#1d2f3a');
    sky.addColorStop(1, '#22282c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, S.W, S.H);

    var glow = ctx.createLinearGradient(0, S.horizon - S.H * 0.3, 0, S.horizon + S.H * 0.2);
    glow.addColorStop(0, 'rgba(91,154,224,0)');
    glow.addColorStop(0.7, 'rgba(91,154,224,0.16)');
    glow.addColorStop(1, 'rgba(207,79,43,0.05)');
    ctx.fillStyle = glow; ctx.fillRect(0, S.horizon - S.H * 0.3, S.W, S.H * 0.5);

    var list = [], i, j, p, sum, map, miss;
    for (i = 0; i < faces.length; i++) {
      var f = faces[i];
      if (time < f.t) continue;
      map = []; sum = 0; miss = false;
      for (j = 0; j < f.p.length; j++) {
        p = S.project(f.p[j][0], f.p[j][1], f.p[j][2]);
        if (!p) { miss = true; break; }
        map.push(p); sum += p[2];
      }
      if (miss) continue;
      var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
      var dd = (n[0] / nm) * L[0] + (n[1] / nm) * L[1] + (n[2] / nm) * L[2];
      var dz = sum / map.length;
      list.push({
        p: map, dz: dz,
        fill: mix(mix(f.c, '#060b11', (1 - (0.66 + 0.5 * Math.max(0, dd))) * 0.5), FOG, S.fog(dz) * 0.68),
        a: Math.min(1, (time - f.t) / 0.45)
      });
    }
    list.sort(function (a, b) { return b.dz - a.dz; });
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      ctx.globalAlpha = it.a;
      ctx.beginPath(); ctx.moveTo(it.p[0][0], it.p[0][1]);
      for (j = 1; j < it.p.length; j++) ctx.lineTo(it.p[j][0], it.p[j][1]);
      ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* dust in the low sun */
    for (i = 0; i < dust.length; i++) {
      var m = dust[i];
      var q = S.project(m.x + Math.sin(time * 0.3 + m.p) * 0.2, m.y + Math.sin(time * 0.5 + m.p) * 0.08, m.z);
      if (!q) continue;
      var al = 0.16 * (0.5 + 0.5 * Math.sin(time * 1.1 + m.p)) * (1 - S.fog(m.z));
      ctx.fillStyle = 'rgba(226,236,244,' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(0.5, (S.focal / q[2]) * 0.008 * m.s), 0, 6.2832); ctx.fill();
    }

    var vg = ctx.createRadialGradient(S.W * 0.5, S.H * 0.55, Math.min(S.W, S.H) * 0.32, S.W * 0.5, S.H * 0.55, Math.max(S.W, S.H) * 0.8);
    vg.addColorStop(0, 'rgba(4,8,12,0)'); vg.addColorStop(1, 'rgba(4,8,12,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, S.W, S.H);
  }

  ground(); fence(); bin(); load(); barrow(); pile(); bricks();
  cone(-0.35, 2.9, 1.2); cone(5.4, 3.1, 1.3); cone(2.9, 2.5, 1.4);
  farBin(-3.2, 13.5, 1); farBin(7.4, 12.4, 0.9);

  function fit() {
    S.resize();
    S.focal = S.H * (S.W < 760 ? 0.98 : 1.18);
    S.horizon = S.H * (S.W < 760 ? 0.46 : 0.52);
    S.camX = S.W < 760 ? 1.45 : 0;
  }
  window.addEventListener('resize', fit);
  fit();

  S.frame(function (t) {
    S.yaw = Projection.reduced() ? 0 : Math.sin(t * 0.14) * 0.018;
    draw(t);
  });
})();
