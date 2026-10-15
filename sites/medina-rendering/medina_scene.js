/* ===== PRO SCENE — Medina Rendering: Mix → Hopper → Wall (OVERCAST-SOFT) =====
 * Standard environment + subject hook for rendering trade.
 * OVERCAST-SOFT: diffuse light, no sun disc, soft ambient shadows, cool grey sky, muted surfaces.
 */
(function () {
  'use strict';
  function init() {
    var cv = document.querySelector('#buildCanvas, #heroCanvas, #c, .scene canvas, .pin canvas') || document.querySelector('canvas');
    if (!cv) return;
    var wrap = cv.closest('[id*="Wrap"], [id*="scene"], .scene, .stage, header') || document.body;
    var stickyWrap = cv.closest('.scene-sticky, .pin, [id*="Sticky"]') || wrap;
    var stgNum = document.getElementById('stageNum'), stgName = document.getElementById('stageName'),
        railFill = document.getElementById('railFill'), heroCopy = document.querySelector('.hero-copy');
    var fixedP = PS.queryP();
    var NAMES = ['mixed', 'base coat', 'finish coat', 'edge cut'];

    var S = PS.setup(cv, {
      sun: 'left', seed: 13, p: fixedP === null ? 0 : fixedP,
      reduce: PS.reduceMotion() || fixedP !== null,
      sky: ['#5a6673', '#8e9aa4', '#c3c8cc'], glow: 0, fogNear: 3, fogFar: 30,
      horizon: 0.46, focal: 1.15, camH: 1.55,
      progress: fixedP !== null ? null : function () {
        var r = wrap.getBoundingClientRect(), span = r.height - window.innerHeight;
        return span <= 0 ? 1 : PS.clamp(-r.top / span, 0, 1);
      },
      onFrame: frame
    });

  /* palette - cool muted tones for overcast */
  var MIXER_BODY = '#2d3036', MIXER_RIM = '#3a3f46',
      HOPPER_BODY = '#25282d', HOPPER_RIM = '#3d444c',
      SAND_WET = '#b8a890', CEMENT_WET = '#6d727a',
      BASE_WET = '#9a9288', BASE_DRY = '#7d776f',
      FINISH_WET = '#c8c0b4', FINISH_DRY = '#a8a298',
      WALL_SUB = '#1e2022', EDGE_ACCENT = '#4a4d52',
      STEEL = '#5a5f66';

  /* ---------- ENVIRONMENT (overcast-soft: no sun disc, diffuse sky, soft haze) ---------- */
  function env(time) {
    var ctx = S.ctx, W = S.W;
    S.sky(0);  // glowK=0 → no sun disc, no warm glow

    /* cool overcast sky gradient */
    var sg = ctx.createLinearGradient(0, 0, 0, S.horizon + 8);
    sg.addColorStop(0, '#4a5560');
    sg.addColorStop(0.45, '#6d7a85');
    sg.addColorStop(0.75, '#8e9aa4');
    sg.addColorStop(1, '#a8b2ba');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, S.horizon + 8);

    /* soft cloud bands - subtle, cool */
    for (var ci = 0; ci < 9; ci++) {
      var cy = S.horizon * (0.08 + ci * 0.09), cw = W * (0.38 + 0.08 * ci),
          cx = W * (0.05 + ((ci * 0.31 + time * 0.000008) % 1) * 0.9);
      var cg = ctx.createLinearGradient(0, cy - 18, 0, cy + 20),
          ca = 0.04 + 0.06 * Math.abs(Math.sin(ci * 1.3));
      cg.addColorStop(0, 'rgba(180,190,200,0)');
      cg.addColorStop(0.4, PS.rgba(ci % 3 === 0 ? '#c8d0d8' : '#b0b8c0', ca));
      cg.addColorStop(0.6, PS.rgba('#98a8b8', ca * 0.5));
      cg.addColorStop(1, 'rgba(180,190,200,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(cx, cy, cw * 0.5, 6 + ci * 2, ci * 0.006 - 0.015, 0, 6.2832); ctx.fill();
    }

    /* horizon haze band - soft, cool */
    S.haze(0.7);

    /* ground plane - cool muted dirt */
    var gN = S.project(0, 0, 2.0), gF = S.project(0, 0, 55);
    var gg = ctx.createLinearGradient(0, gF[1], 0, gN[1]);
    gg.addColorStop(0, PS.mix('#8e9aa4', '#2d3036', 0.65));
    gg.addColorStop(0.3, PS.mix('#2d3036', '#1e2022', 0.4));
    gg.addColorStop(1, '#181a1c');
    ctx.fillStyle = gg; ctx.fillRect(0, gF[1] - 1, W, gN[1] - gF[1] + 2);
    S.texture([S.project(-55, 0, 52), S.project(55, 0, 52), S.project(55, 0, 2), S.project(-55, 0, 2)], 'grain', 380, 0.025);

    /* distant treeline - faded into haze */
    treeLine(65, 0.02, 2.5, PS.mix(S.skyCols[2], '#4a5560', 0.4), 0.25);
    treeLine(42, 0.01, 2.0, PS.mix(S.skyCols[2], '#3a424a', 0.55), 0.45);

    /* scale cue - traffic cone near mixer */
    S.scaleCue(-6.0, 8.5, 'cone');
  }

  function treeLine(z, baseY, amp, col, alpha) {
    var pts = [], x;
    for (x = -42; x <= 42; x += 1.5) {
      var h = Math.sin(x * 0.35) * 0.45 + Math.sin(x * 0.12 + 1.5) * 0.85 + Math.sin(x * 1.05) * 0.14;
      pts.push(S.project(x, baseY + Math.max(0, h) * amp, z));
    }
    var f = S.project(-42, baseY, z), l = S.project(42, baseY, z);
    S.poly([[f[0], f[1]]].concat(pts).concat([[l[0], l[1]]]), col, null, alpha);
  }

  function grade(time) {
    var ctx = S.ctx;
    /* cool rim grade - no warm tones */
    var rim = ctx.createLinearGradient(0, 0, S.W, S.H);
    rim.addColorStop(0, 'rgba(100,110,120,.05)');
    rim.addColorStop(0.5, 'rgba(100,110,120,0)');
    rim.addColorStop(1, 'rgba(40,50,60,.04)');
    ctx.fillStyle = rim; ctx.fillRect(0, 0, S.W, S.H);
    S.dust(28, time);
    S.grade();
  }

  /* ---------- SUBJECT: Mixer → Hopper → Wall sweep (two grain changes) ---------- */
  function drawSubject(p, time) {
    var ctx = S.ctx;
    var X0 = -5.2, X1 = 5.2, Z0 = 6.0, Z1 = 20.0, SLAB = 0.45;

    /* stage timing */
    var tMix = PS.stage(p, 0.00, 0.22, 'place');      // mixer spinning, blending
    var tHopper = PS.stage(p, 0.20, 0.20, 'place');   // mix flowing into hopper
    var tBase = PS.stage(p, 0.40, 0.30, 'release');   // base coat sweep across wall
    var tFinish = PS.stage(p, 0.68, 0.30, 'place');   // finish coat sweep
    var tEdge = PS.stage(p, 0.90, 0.10, 'settle');    // straight edge cuts clean line

    /* ---- MIXER (foreground left) ---- */
    var mx = -7.0, my = 0.0, mz = 8.5;
    var mPos = S.project(mx, my, mz);
    if (mPos[2] > 0) {
      var scale = S.focal / mz;
      var drumR = 1.3 * scale;
      var cx = mPos[0], cy = mPos[1];

      /* contact shadow under mixer */
      S.shadow(mx, mz, 1.6, 0.9, 0.35 * tMix);
      S.contactAO(mx, mz, 1.5, 1.0, 0.28 * tMix);

      ctx.save();
      ctx.translate(cx, cy);
      var drumAngle = time * 0.0015 + tMix * Math.PI * 3;

      /* drum body - cool steel */
      var drumGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, drumR);
      drumGrad.addColorStop(0, '#3d424a');
      drumGrad.addColorStop(0.6, MIXER_BODY);
      drumGrad.addColorStop(1, '#1a1c1f');
      ctx.fillStyle = drumGrad;
      ctx.beginPath(); ctx.ellipse(0, 0, drumR, drumR * 0.55, 0, 0, 6.2832); ctx.fill();

      /* drum rim */
      ctx.strokeStyle = PS.rgba(MIXER_RIM, 0.5); ctx.lineWidth = 2 * scale;
      ctx.beginPath(); ctx.ellipse(0, 0, drumR, drumR * 0.55, 0, 0, 6.2832); ctx.stroke();

      /* mixing blades - implied by particle motion */
      ctx.rotate(drumAngle * 0.08);

      /* particles inside - sand (warm beige) and cement (cool grey) blending */
      for (var i = 0; i < 90; i++) {
        var seed = (i * 73 + time * 0.0003) % 1;
        var pr = (0.15 + seed * 0.55) * drumR * 0.75;
        var ang = (i * 2.39 + drumAngle * 0.6) % 6.2832;
        var px = Math.cos(ang) * pr;
        var py = Math.sin(ang) * pr * 0.55;
        var pz = Math.cos(i * 1.7 + time * 0.0008) * pr * 0.35;

        if (pz > -0.15) {
          var alpha = (pz + 0.35) / 0.5 * 0.45 * tMix;
          var isSand = (i * 17) % 100 < 60;
          var size = (1.5 + (i % 3) * 1.2) * scale * 0.5;
          ctx.fillStyle = isSand
            ? PS.rgba(SAND_WET, alpha)
            : PS.rgba(CEMENT_WET, alpha);
          ctx.beginPath(); ctx.arc(px, py, size, 0, 6.2832); ctx.fill();
        }
      }
      ctx.restore();

      /* mixer frame */
      ctx.strokeStyle = PS.rgba(MIXER_RIM, 0.3); ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - drumR * 1.2, cy + drumR * 0.7);
      ctx.lineTo(cx - drumR * 1.2, cy - drumR * 0.7);
      ctx.moveTo(cx + drumR * 1.2, cy + drumR * 0.7);
      ctx.lineTo(cx + drumR * 1.2, cy - drumR * 0.7);
      ctx.stroke();

      /* label */
      ctx.fillStyle = PS.rgba(STEEL, 0.6); ctx.font = 'bold ' + (9 * scale) + 'px ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.fillText('MIXER', cx, cy - drumR * 1.4);
    }

    /* ---- HOPPER (center, below mixer) ---- */
    var hx = -1.0, hy = -0.8, hz = 11.5;
    var hPos = S.project(hx, hy, hz);
    if (hPos[2] > 0) {
      var scale = S.focal / hz;
      var cx = hPos[0], cy = hPos[1];
      var hopperW = 1.4 * scale, hopperH = 2.2 * scale;

      /* contact shadow */
      S.shadow(hx, hz, 1.0, 0.6, 0.3 * tHopper);
      S.contactAO(hx, hz, 1.1, 0.8, 0.22 * tHopper);

      /* hopper cone */
      var coneGrad = ctx.createLinearGradient(cx - hopperW, cy, cx + hopperW, cy + hopperH);
      coneGrad.addColorStop(0, '#3d444c');
      coneGrad.addColorStop(0.5, HOPPER_BODY);
      coneGrad.addColorStop(1, '#1a1c1f');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(cx - hopperW, cy - hopperH * 0.15);
      ctx.lineTo(cx, cy + hopperH);
      ctx.lineTo(cx + hopperW, cy - hopperH * 0.15);
      ctx.closePath(); ctx.fill();

      /* hopper rim */
      ctx.strokeStyle = PS.rgba(HOPPER_RIM, 0.45); ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - hopperW, cy - hopperH * 0.15);
      ctx.lineTo(cx, cy + hopperH);
      ctx.lineTo(cx + hopperW, cy - hopperH * 0.15);
      ctx.stroke();

      /* flow particles - sand + cement streaming down */
      if (tHopper > 0.15) {
        for (var j = 0; j < 50; j++) {
          var fseed = (j * 31 + time * 0.002) % 1;
          var fy = -0.3 + fseed * 2.2 * tHopper;
          var fx = (Math.sin(j * 2.1 + time * 0.0015) * 0.35) * (1 - fseed * 0.3);
          var fz = (Math.cos(j * 1.7) * 0.35) * (1 - fseed * 0.3);
          var fpos = S.project(hx + fx, hy - fy, hz + fz);
          if (fpos[2] > 0) {
            var falpha = tHopper * 0.5 * (1 - fy / 2.5) * (1 - fseed * 0.5);
            var fsize = (0.018 + (j % 4) * 0.008) * S.focal / (hz + fz) * 1.8;
            var isSand = (j * 13) % 100 < 55;
            ctx.fillStyle = isSand
              ? PS.rgba(SAND_WET, falpha)
              : PS.rgba(CEMENT_WET, falpha);
            ctx.beginPath(); ctx.arc(fpos[0], fpos[1], fsize, 0, 6.2832); ctx.fill();
          }
        }
      }

      /* label */
      ctx.fillStyle = PS.rgba(STEEL, 0.55); ctx.font = 'bold ' + (8 * scale) + 'px ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.fillText('HOPPER', cx, cy - hopperH * 0.8);
    }

    /* ---- WALL (background, receiving the application) ---- */
    var wx = 0, wy = 0, wz = 15.0;
    var wPos = S.project(wx, wy, wz);
    if (wPos[2] > 0) {
      var scale = S.focal / wz;
      var cx = wPos[0], cy = wPos[1];
      var wW = 18 * scale, wH = 10 * scale;

      /* wall substrate - dark cool base */
      var wallGrad = ctx.createLinearGradient(cx - wW/2, cy - wH/2, cx + wW/2, cy + wH/2);
      wallGrad.addColorStop(0, '#1a1c1e');
      wallGrad.addColorStop(0.5, WALL_SUB);
      wallGrad.addColorStop(1, '#16181a');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(cx - wW/2, cy - wH/2, wW, wH);

      /* wall border */
      ctx.strokeStyle = 'rgba(154,163,173,.06)'; ctx.lineWidth = 1;
      ctx.strokeRect(cx - wW/2, cy - wH/2, wW, wH);

      /* contact shadow along bottom of wall */
      S.contactAO(wx, wz, 9, 0.5, 0.35);

      /* ---- BASE COAT SWEEP (coarse grain) ---- */
      if (tBase > 0) {
        var baseW = wW * tBase;
        var baseGrad = ctx.createLinearGradient(cx - wW/2, 0, cx - wW/2 + baseW, 0);
        baseGrad.addColorStop(0, PS.rgba(BASE_WET, 0.35));
        baseGrad.addColorStop(0.4, PS.rgba(BASE_WET, 0.5));
        baseGrad.addColorStop(0.7, PS.rgba(BASE_DRY, 0.45));
        baseGrad.addColorStop(1, PS.rgba(BASE_DRY, 0.25));
        ctx.fillStyle = baseGrad;
        ctx.fillRect(cx - wW/2, cy - wH/2, baseW, wH);

        /* base coat texture - coarse aggregate/grain */
        S.texture(
          [S.project(X0 + 0.05, SLAB, Z0 + 0.05), S.project(X1 - 0.05, SLAB, Z0 + 0.05),
           S.project(X1 - 0.05, SLAB, Z0 + wW/scale * tBase - 0.05), S.project(X0 + 0.05, SLAB, Z0 + wW/scale * tBase - 0.05)],
          'aggregate', 420 * tBase, 0.07
        );

        /* mottling - tonal variation on wet base coat */
        S.mottle(
          [S.project(X0 + 0.05, SLAB, Z0 + 0.05), S.project(X1 - 0.05, SLAB, Z0 + 0.05),
           S.project(X1 - 0.05, SLAB, Z0 + wW/scale * tBase - 0.05), S.project(X0 + 0.05, SLAB, Z0 + wW/scale * tBase - 0.05)],
          BASE_WET, 0.12, 20
        );

        /* leading edge of base coat - soft transition */
        var edgeX = cx - wW/2 + baseW;
        var edgeGrad = ctx.createLinearGradient(edgeX - 30, 0, edgeX + 30, 0);
        edgeGrad.addColorStop(0, 'rgba(154,148,136,0)');
        edgeGrad.addColorStop(0.5, PS.rgba(BASE_WET, 0.35));
        edgeGrad.addColorStop(1, 'rgba(154,148,136,0)');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(edgeX - 30, cy - wH/2, 60, wH);
      }

      /* ---- FINISH COAT SWEEP (fine grain) ---- */
      if (tFinish > 0) {
        var finishW = wW * tFinish;
        var finishGrad = ctx.createLinearGradient(cx - wW/2, 0, cx - wW/2 + finishW, 0);
        finishGrad.addColorStop(0, PS.rgba(FINISH_WET, 0.5));
        finishGrad.addColorStop(0.4, PS.rgba(FINISH_WET, 0.65));
        finishGrad.addColorStop(0.7, PS.rgba(FINISH_DRY, 0.55));
        finishGrad.addColorStop(1, PS.rgba(FINISH_DRY, 0.3));
        ctx.fillStyle = finishGrad;
        ctx.fillRect(cx - wW/2, cy - wH/2, finishW, wH);

        /* finish coat texture - fine grain */
        S.texture(
          [S.project(X0 + 0.05, SLAB, Z0 + 0.05), S.project(X1 - 0.05, SLAB, Z0 + 0.05),
           S.project(X1 - 0.05, SLAB, Z0 + wW/scale * tFinish - 0.05), S.project(X0 + 0.05, SLAB, Z0 + wW/scale * tFinish - 0.05)],
          'grain', 520 * tFinish, 0.045
        );

        /* mottling - subtle on finish */
        S.mottle(
          [S.project(X0 + 0.05, SLAB, Z0 + 0.05), S.project(X1 - 0.05, SLAB, Z0 + 0.05),
           S.project(X1 - 0.05, SLAB, Z0 + wW/scale * tFinish - 0.05), S.project(X0 + 0.05, SLAB, Z0 + wW/scale * tFinish - 0.05)],
          FINISH_WET, 0.08, 16
        );

        /* leading edge of finish coat */
        var fEdgeX = cx - wW/2 + finishW;
        var fEdgeGrad = ctx.createLinearGradient(fEdgeX - 25, 0, fEdgeX + 25, 0);
        fEdgeGrad.addColorStop(0, 'rgba(200,192,180,0)');
        fEdgeGrad.addColorStop(0.5, PS.rgba(FINISH_WET, 0.4));
        fEdgeGrad.addColorStop(1, 'rgba(200,192,180,0)');
        ctx.fillStyle = fEdgeGrad;
        ctx.fillRect(fEdgeX - 25, cy - wH/2, 50, wH);
      }

      /* ---- STRAIGHT EDGE (clean cut line) ---- */
      if (tEdge > 0 && tFinish > 0.8) {
        var edgeX = cx - wW/2 + wW * tEdge;
        /* the cut line - dark cool accent */
        var cutGrad = ctx.createLinearGradient(edgeX - 15, 0, edgeX + 15, 0);
        cutGrad.addColorStop(0, 'rgba(74,77,82,0)');
        cutGrad.addColorStop(0.5, PS.rgba(EDGE_ACCENT, 0.9));
        cutGrad.addColorStop(1, 'rgba(74,77,82,0)');
        ctx.strokeStyle = cutGrad; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(edgeX, cy - wH/2); ctx.lineTo(edgeX, cy + wH/2); ctx.stroke();

        /* highlight on the clean edge */
        ctx.strokeStyle = PS.rgba('#9aa3ad', 0.45); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(edgeX + 1, cy - wH/2); ctx.lineTo(edgeX + 1, cy + wH/2); ctx.stroke();
      }

      /* ---- SPRAYER/TROWEL TOOL INDICATOR ---- */
      var toolProg = Math.max(tBase, tFinish);
      if (toolProg > 0 && toolProg < 1) {
        var toolX = cx - wW/2 + wW * toolProg;
        var toolY = cy - wH/2 - 35 * scale;
        ctx.fillStyle = PS.rgba(STEEL, 0.75);
        ctx.beginPath();
        ctx.moveTo(toolX, toolY);
        ctx.lineTo(toolX - 18 * scale, toolY - 28 * scale);
        ctx.lineTo(toolX + 18 * scale, toolY - 28 * scale);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = PS.rgba('#4a4d52', 0.8);
        ctx.fillRect(toolX - 10 * scale, toolY - 28 * scale, 20 * scale, 22 * scale);
      }

      /* ---- PHASE LABELS on wall ---- */
      ctx.fillStyle = PS.rgba('#9aa3ad', 0.5);
      ctx.font = 'bold ' + (10 * scale) + 'px ui-monospace,monospace';
      ctx.textAlign = 'center';
      if (tBase > 0 && tBase < 1) ctx.fillText('BASE COAT', cx, cy - wH/2 - 45 * scale);
      else if (tFinish > 0 && tFinish < 1) ctx.fillText('FINISH COAT', cx, cy - wH/2 - 45 * scale);
      else if (tEdge > 0 && tEdge < 1) ctx.fillText('EDGE CUT', cx, cy - wH/2 - 45 * scale);
      else if (p >= 0.98) ctx.fillText('MEDINA IS THE WAY', cx, cy - wH/2 - 45 * scale);
    }
  }

  function frame(S_, p, time) {
    S = S_;
    env(time);
    drawSubject(p, time);
    grade(time);

    var idx = p < 0.22 ? 0 : p < 0.52 ? 1 : p < 0.82 ? 2 : 3;
    if (stgNum) stgNum.textContent = '0' + (idx + 1);
    if (stgName) stgName.textContent = ['Mixed', 'Base coat', 'Finish coat', 'Edge cut'][idx];
    if (railFill) railFill.style.height = Math.round(p * 100) + '%';
    if (heroCopy) heroCopy.style.opacity = PS.clamp(1 - p * 2.2, 0, 1);
  }

  S.start();
}

if (typeof PS !== 'undefined') {
  init();
} else {
  window.addEventListener('load', function waitPS() {
    if (typeof PS !== 'undefined') {
      window.removeEventListener('load', waitPS);
      init();
    }
  });
}

})();