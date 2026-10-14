/* ===== PRO SCENE — Baker Concrete: Board-formed wall strike =====
 * Subject: timber formwork built up, concrete placed, panels struck one by one
 * revealing board-marked faces. Architectural, calm, white/graphite palette.
 * Replaces drawSubject() in the generic scene; keeps env/grade/HUD wiring.
 */
(function () {
  'use strict';
  var cv = document.querySelector('#buildCanvas, #heroCanvas, #c, .scene canvas, .pin canvas') || document.querySelector('canvas');
  if (!cv) return;
  var wrap = cv.closest('[id*="Wrap"], [id*="scene"], .scene, .stage, header') || document.body;
  var stickyWrap = cv.closest('.scene-sticky, .pin, [id*="Sticky"]') || wrap;
  var stgNum = document.getElementById('stgNum'), stgName = document.getElementById('stgName'),
      railFill = document.getElementById('railFill'), heroCopy = document.getElementById('heroCopy');
  var fixedP = PS.queryP();

  var S = PS.setup(cv, {
    sun: 'left', seed: 11, p: fixedP === null ? 0 : fixedP,
    reduce: PS.reduceMotion() || fixedP !== null,
    sky: ['#1a1a1a', '#2a2a2a', '#3a3a3a'], glow: '#393f65', fogNear: 2, fogFar: 28,
    horizon: 0.42, focal: 1.35, camH: 1.35,
    progress: fixedP !== null ? null : function () {
      var r = wrap.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span <= 0 ? 1 : PS.clamp(-r.top / span, 0, 1);
    },
    onFrame: frame
  });

  /* Palette — dark concrete/graphite/brand navy per brand */
  var GRAPHITE  = '#2d2d2d';
  var GRAPHITE_D = '#1a1a1a';
  var COOL_GREY = '#8a8a8a';
  var COOL_GREY_D = '#6b6b6b';
  var WHITE     = '#fafafa';
  var WHITE_WARM = '#e8e6e2';
  var TIMBER    = '#c4a07a';
  var TIMBER_D  = '#a0805a';
  var TIMBER_L  = '#d4b890';
  var STEEL     = '#b0bcc8';
  var STEEL_D   = '#8a9aad';
  var CONC_WET  = '#d8d6d0';
  var CONC_DRY  = '#f0eeea';
  var BOARD_GRAIN = '#7a6a5a';

  /* ---------- ENVIRONMENT — calm architectural light (overcast) ---------- */
  function env(time) {
    var ctx = S.ctx, W = S.W;
    S.sky(0.15); // subtle glow
    var g = ctx.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, '#fafafa');
    g.addColorStop(0.42, '#e8e8e8');
    g.addColorStop(0.7, '#d8d8d8');
    g.addColorStop(1, '#c8c8c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, S.H);
    S.haze(0.4);
    var vh = ctx.createLinearGradient(0, S.horizon - S.H * 0.01, 0, S.horizon + S.H * 0.06);
    vh.addColorStop(0, 'rgba(57,63,101,.12)'); vh.addColorStop(1, 'rgba(57,63,101,0)');
    ctx.fillStyle = vh; ctx.fillRect(0, S.horizon - S.H * 0.01, W, S.H * 0.07);
    var gN = S.project(0, 0, 1.5), gF = S.project(0, 0, 45);
    var gg = ctx.createLinearGradient(0, gF[1], 0, gN[1]);
    gg.addColorStop(0, PS.mix('#d0d0d0', GRAPHITE, 0.25));
    gg.addColorStop(0.4, PS.mix('#d0d0d0', GRAPHITE, 0.10));
    gg.addColorStop(1, WHITE_WARM);
    ctx.fillStyle = gg; ctx.fillRect(0, gF[1] - 1, W, gN[1] - gF[1] + 2);
    S.texture([S.project(-50, 0, 42), S.project(50, 0, 42), S.project(50, 0, 1.5), S.project(-50, 0, 1.5)], 'grain', 280, .02);
  }

  function grade(time) {
    var ctx = S.ctx;
    var rim = ctx.createLinearGradient(0, 0, S.W, S.H);
    rim.addColorStop(0, 'rgba(200,200,200,.04)'); rim.addColorStop(0.5, 'rgba(200,200,200,0)'); rim.addColorStop(1, 'rgba(40,40,40,.03)');
    ctx.fillStyle = rim; ctx.fillRect(0, 0, S.W, S.H);
    S.dust(18, time);
    S.grade();
  }

  /* ---------- SUBJECT: board-formed wall build → pour → strike ---------- */
  function drawSubject(p, time) {
    var ctx = S.ctx;
    var WALL_W = 6.0, WALL_H = 3.0, WALL_D = 0.25;
    var FW = WALL_W + 0.6, FH = WALL_H + 0.2, FD = 0.6;
    var PANEL_W = 1.5, PANEL_H = 3.0, PANEL_GAP = 0.02, PANEL_TH = 0.05;
    var panelCountX = Math.floor(WALL_W / PANEL_W);
    var backZ = -FD / 2;
    var frontZ = FD / 2;

    /* Stages (p ranges) */
    var tGround   = PS.stage(p, 0.00, 0.06, 'place');
    var tBase     = PS.stage(p, 0.04, 0.08, 'place');
    var tBackPan  = PS.stage(p, 0.10, 0.16, 'place');
    var tSidePan  = PS.stage(p, 0.22, 0.12, 'place');
    var tFrontPan = PS.stage(p, 0.32, 0.14, 'place');
    var tTopWal   = PS.stage(p, 0.44, 0.08, 'place');
    var tTies     = PS.stage(p, 0.50, 0.06, 'place');
    var tPour     = PS.stage(p, 0.56, 0.16, 'settle');
    var tStrikeB  = PS.stage(p, 0.70, 0.12, 'release');
    var tStrikeS  = PS.stage(p, 0.78, 0.10, 'release');
    var tStrikeF  = PS.stage(p, 0.85, 0.12, 'release');
    var tProps    = PS.stage(p, 0.94, 0.06, 'release');
    var tFinal    = PS.clamp((p - 0.98) / 0.02, 0, 1);

    /* Ground */
    if (tGround > 0) {
      var gp = [S.project(-FW, 0.001, -FD), S.project(FW, 0.001, -FD), S.project(FW, 0.001, FD), S.project(-FW, 0.001, FD)];
      S.poly(gp, WHITE_WARM, null, tGround * 0.15);
      S.texture(gp, 'grain', 180, 0.015 * tGround);
    }

    /* Base plates */
    if (tBase > 0) {
      var bp = [S.project(-FW/2, 0.03, -FD/2), S.project(FW/2, 0.03, -FD/2), S.project(FW/2, 0.03, FD/2), S.project(-FW/2, 0.03, FD/2)];
      var bpFace = ctx.createLinearGradient(0, bp[0][1], 0, bp[2][1]);
      bpFace.addColorStop(0, PS.lighten(TIMBER, 0.08)); bpFace.addColorStop(1, PS.darken(TIMBER_D, 0.15));
      S.poly(bp, bpFace, PS.rgba(TIMBER_D, 0.4), tBase);
      S.texture(bp, 'streak', 100, 0.04 * tBase);
      S.shadow(0, 0, FW/2, FD/2, 0.35 * tBase);
      S.contactAO(0, 0, FW/2, FD/2, 0.25 * tBase);
    }

    /* Back wall panels */
    for (var px = 0; px < panelCountX; px++) {
      var pxPos = -(WALL_W/2) + PANEL_W/2 + px * (PANEL_W + PANEL_GAP);
      var k = PS.clamp((tBackPan * panelCountX - px) / 1.3, 0, 1);
      if (k <= 0) continue;
      var panel = [
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2, PANEL_H/2, backZ - PANEL_TH/2),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2, PANEL_H/2, backZ - PANEL_TH/2),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2, -PANEL_H/2, backZ - PANEL_TH/2),
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2, -PANEL_H/2, backZ - PANEL_TH/2)
      ];
      var face = ctx.createLinearGradient(0, panel[0][1], 0, panel[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER, 0.12)); face.addColorStop(1, PS.darken(TIMBER_D, 0.18));
      S.poly(panel, face, PS.rgba(TIMBER_D, 0.5), k);
      S.mottle(panel, TIMBER, 0.08, 12);
      S.texture(panel, 'streak', 80, 0.05 * k);
      S.shadow(pxPos, backZ, PANEL_W/2, PANEL_H/2, 0.35 * k);
      S.castShadow(pxPos, backZ, PANEL_W/2, PANEL_H, 1.2, 0.22 * k);
      S.rim(panel[0], panel[1], 'rgba(255,255,255,.35)', 0.6 * k, 1.5);
    }

    /* Side walls */
    var sidePanelCountZ = Math.floor(FD / PANEL_W);
    for (var pz = 0; pz < sidePanelCountZ; pz++) {
      var pzPos = -(FD/2) + PANEL_W/2 + pz * (PANEL_W + PANEL_GAP);
      var k = PS.clamp((tSidePan * sidePanelCountZ - pz) / 1.2, 0, 1);
      if (k <= 0) continue;
      var left = [
        S.project(-FW/2 + PANEL_TH/2, PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2),
        S.project(-FW/2 - PANEL_TH/2, PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2),
        S.project(-FW/2 - PANEL_TH/2, -PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2),
        S.project(-FW/2 + PANEL_TH/2, -PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2)
      ];
      var right = [
        S.project(FW/2 - PANEL_TH/2, PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2),
        S.project(FW/2 + PANEL_TH/2, PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2),
        S.project(FW/2 + PANEL_TH/2, -PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2),
        S.project(FW/2 - PANEL_TH/2, -PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2)
      ];
      var face = ctx.createLinearGradient(0, left[0][1], 0, left[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER, 0.10)); face.addColorStop(1, PS.darken(TIMBER_D, 0.20));
      S.poly(left, face, PS.rgba(TIMBER_D, 0.5), k);
      S.poly(right, face, PS.rgba(TIMBER_D, 0.5), k);
      S.texture(left, 'streak', 60, 0.04 * k);
      S.texture(right, 'streak', 60, 0.04 * k);
      S.shadow(-FW/2, pzPos, PANEL_TH/2, PANEL_W/2, 0.3 * k);
      S.shadow(FW/2, pzPos, PANEL_TH/2, PANEL_W/2, 0.3 * k);
      S.castShadow(-FW/2, pzPos, PANEL_TH/2, PANEL_H, 1.0, 0.2 * k);
      S.castShadow(FW/2, pzPos, PANEL_TH/2, PANEL_H, 1.0, 0.2 * k);
    }

    /* Front wall panels (with opening) */
    var openingStart = -1.2, openingEnd = 1.2;
    for (var px = 0; px < panelCountX; px++) {
      var pxPos = -(WALL_W/2) + PANEL_W/2 + px * (PANEL_W + PANEL_GAP);
      if (pxPos + PANEL_W/2 > openingStart && pxPos - PANEL_W/2 < openingEnd) continue;
      var k = PS.clamp((tFrontPan * panelCountX - px) / 1.4, 0, 1);
      if (k <= 0) continue;
      var panel = [
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2, PANEL_H/2, frontZ + PANEL_TH/2),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2, PANEL_H/2, frontZ + PANEL_TH/2),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2, -PANEL_H/2, frontZ + PANEL_TH/2),
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2, -PANEL_H/2, frontZ + PANEL_TH/2)
      ];
      var face = ctx.createLinearGradient(0, panel[0][1], 0, panel[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER, 0.12)); face.addColorStop(1, PS.darken(TIMBER_D, 0.18));
      S.poly(panel, face, PS.rgba(TIMBER_D, 0.5), k);
      S.mottle(panel, TIMBER, 0.08, 12);
      S.texture(panel, 'streak', 80, 0.05 * k);
      S.shadow(pxPos, frontZ, PANEL_W/2, PANEL_H/2, 0.35 * k);
      S.castShadow(pxPos, frontZ, PANEL_W/2, PANEL_H, 1.2, 0.22 * k);
      S.rim(panel[0], panel[1], 'rgba(255,255,255,.35)', 0.6 * k, 1.5);
    }

    /* Top walers */
    if (tTopWal > 0) {
      var twBack = [
        S.project(-FW/2, FH, backZ - PANEL_TH/2),
        S.project(FW/2, FH, backZ - PANEL_TH/2),
        S.project(FW/2, FH, backZ + PANEL_TH/2),
        S.project(-FW/2, FH, backZ + PANEL_TH/2)
      ];
      var twFront = [
        S.project(-FW/2, FH, frontZ - PANEL_TH/2),
        S.project(FW/2, FH, frontZ - PANEL_TH/2),
        S.project(FW/2, FH, frontZ + PANEL_TH/2),
        S.project(-FW/2, FH, frontZ + PANEL_TH/2)
      ];
      var twLeft = [
        S.project(-FW/2 + PANEL_TH/2, FH, -FD/2),
        S.project(-FW/2 - PANEL_TH/2, FH, -FD/2),
        S.project(-FW/2 - PANEL_TH/2, FH, FD/2),
        S.project(-FW/2 + PANEL_TH/2, FH, FD/2)
      ];
      var twRight = [
        S.project(FW/2 - PANEL_TH/2, FH, -FD/2),
        S.project(FW/2 + PANEL_TH/2, FH, -FD/2),
        S.project(FW/2 + PANEL_TH/2, FH, FD/2),
        S.project(FW/2 - PANEL_TH/2, FH, FD/2)
      ];
      var face = ctx.createLinearGradient(0, twBack[0][1], 0, twBack[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER_D, 0.08)); face.addColorStop(1, PS.darken(TIMBER_D, 0.15));
      S.poly(twBack, face, PS.rgba(TIMBER_D, 0.6), tTopWal);
      S.poly(twFront, face, PS.rgba(TIMBER_D, 0.6), tTopWal);
      S.poly(twLeft, face, PS.rgba(TIMBER_D, 0.6), tTopWal);
      S.poly(twRight, face, PS.rgba(TIMBER_D, 0.6), tTopWal);
      S.texture(twBack, 'streak', 50, 0.04 * tTopWal);
      S.texture(twFront, 'streak', 50, 0.04 * tTopWal);
    }

    /* Steel ties */
    if (tTies > 0) {
      for (var ti = 0; ti < 8; ti++) {
        var tx = -2.5 + ti * 0.75;
        var k = PS.clamp((tTies * 8 - ti) / 1.5, 0, 1);
        if (k <= 0) continue;
        var tie = [
          S.project(tx - 0.02, 0.2, backZ - 0.12),
          S.project(tx + 0.02, 0.2, backZ - 0.12),
          S.project(tx + 0.02, FH - 0.2, backZ - 0.12),
          S.project(tx - 0.02, FH - 0.2, backZ - 0.12)
        ];
        S.poly(tie, STEEL_D, PS.rgba(STEEL, 0.8), k);
        S.shadow(tx, backZ, 0.02, 1.5, 0.25 * k);
        S.castShadow(tx, backZ, 0.02, FH - 0.4, 0.8, 0.18 * k);
      }
    }

    /* Concrete wall inside formwork */
    if (tPour > 0) {
      var conc = [
        S.project(-WALL_W/2 + WALL_D/2, WALL_H/2, 0),
        S.project(WALL_W/2 - WALL_D/2, WALL_H/2, 0),
        S.project(WALL_W/2 - WALL_D/2, -WALL_H/2, 0),
        S.project(-WALL_W/2 + WALL_D/2, -WALL_H/2, 0)
      ];
      var baseCol = PS.mix(CONC_WET, CONC_DRY, tPour * 0.7);
      var g = ctx.createLinearGradient(0, conc[0][1], 0, conc[2][1]);
      g.addColorStop(0, PS.lighten(baseCol, 0.12));
      g.addColorStop(0.5, baseCol);
      g.addColorStop(1, PS.darken(baseCol, 0.18));
      S.poly(conc, g, null, tPour);
      S.mottle(conc, baseCol, 0.10, 22);
      S.texture(conc, 'aggregate', 300, 0.045 * tPour);
      S.contactAO(0, 0, WALL_W/2, WALL_D/2, 0.32 * tPour);
      S.rim(conc[0], conc[1], 'rgba(255,255,255,.45)', 0.8 * tPour, 2);
      S.rim(conc[1], conc[2], 'rgba(255,255,255,.25)', 0.5 * tPour, 1.5);

      /* Wet sheen early */
      if (tPour < 0.7) {
        var sheen = ctx.createLinearGradient(0, conc[0][1], 0, conc[0][1] + (conc[2][1] - conc[0][1]) * 0.25);
        sheen.addColorStop(0, 'rgba(255,255,255,' + (0.18 * (1 - tPour)) + ')');
        sheen.addColorStop(1, 'rgba(255,255,255,0)');
        S.poly(conc, sheen, null, tPour);
      }
    }

    /* Strike sequence — panels fly off revealing board-marked concrete */
    /* Back wall strikes */
    for (var px = panelCountX - 1; px >= 0; px--) {
      var pxPos = -(WALL_W/2) + PANEL_W/2 + px * (PANEL_W + PANEL_GAP);
      var delay = (panelCountX - 1 - px) * 0.018;
      var k = PS.clamp((tStrikeB - delay) / 0.12, 0, 1);
      if (k <= 0) continue;
      var eased = PS.ease.out(k);
      var flyX = 0, flyZ = -6 * eased, rotX = 0.6 * eased;
      var panel = [
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2 + flyX, PANEL_H/2, backZ - PANEL_TH/2 + flyZ),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2 + flyX, PANEL_H/2, backZ - PANEL_TH/2 + flyZ),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2 + flyX, -PANEL_H/2, backZ - PANEL_TH/2 + flyZ),
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2 + flyX, -PANEL_H/2, backZ - PANEL_TH/2 + flyZ)
      ];
      var face = ctx.createLinearGradient(0, panel[0][1], 0, panel[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER, 0.10)); face.addColorStop(1, PS.darken(TIMBER_D, 0.20));
      S.poly(panel, face, PS.rgba(TIMBER_D, 0.5), 1 - eased * 0.3);
      S.texture(panel, 'streak', 80, 0.05);
      S.shadow(pxPos + flyX, backZ + flyZ, PANEL_W/2, PANEL_H/2, 0.3 * (1 - eased));
      if (eased > 0.15) {
        S.rim(panel[0], panel[1], 'rgba(255,255,255,.4)', 0.6, 1.5);
      }
    }

    /* Side walls strike */
    for (var pz = sidePanelCountZ - 1; pz >= 0; pz--) {
      var pzPos = -(FD/2) + PANEL_W/2 + pz * (PANEL_W + PANEL_GAP);
      var delay = (sidePanelCountZ - 1 - pz) * 0.018;
      var k = PS.clamp((tStrikeS - delay) / 0.10, 0, 1);
      if (k <= 0) continue;
      var eased = PS.ease.out(k);
      var flyX_L = -5 * eased, flyX_R = 5 * eased, rotZ = 0.5 * eased;
      var left = [
        S.project(-FW/2 + PANEL_TH/2 + flyX_L, PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2),
        S.project(-FW/2 - PANEL_TH/2 + flyX_L, PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2),
        S.project(-FW/2 - PANEL_TH/2 + flyX_L, -PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2),
        S.project(-FW/2 + PANEL_TH/2 + flyX_L, -PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2)
      ];
      var right = [
        S.project(FW/2 - PANEL_TH/2 + flyX_R, PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2),
        S.project(FW/2 + PANEL_TH/2 + flyX_R, PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2),
        S.project(FW/2 + PANEL_TH/2 + flyX_R, -PANEL_H/2, pzPos + PANEL_W/2 - PANEL_GAP/2),
        S.project(FW/2 - PANEL_TH/2 + flyX_R, -PANEL_H/2, pzPos - PANEL_W/2 + PANEL_GAP/2)
      ];
      var face = ctx.createLinearGradient(0, left[0][1], 0, left[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER, 0.10)); face.addColorStop(1, PS.darken(TIMBER_D, 0.20));
      S.poly(left, face, PS.rgba(TIMBER_D, 0.5), 1 - eased * 0.3);
      S.poly(right, face, PS.rgba(TIMBER_D, 0.5), 1 - eased * 0.3);
      S.shadow(-FW/2 + flyX_L, pzPos, PANEL_TH/2, PANEL_W/2, 0.25 * (1 - eased));
      S.shadow(FW/2 + flyX_R, pzPos, PANEL_TH/2, PANEL_W/2, 0.25 * (1 - eased));
    }

    /* Front wall strikes */
    for (var px = panelCountX - 1; px >= 0; px--) {
      var pxPos = -(WALL_W/2) + PANEL_W/2 + px * (PANEL_W + PANEL_GAP);
      if (pxPos + PANEL_W/2 > openingStart && pxPos - PANEL_W/2 < openingEnd) continue;
      var delay = (panelCountX - 1 - px) * 0.015;
      var k = PS.clamp((tStrikeF - delay) / 0.12, 0, 1);
      if (k <= 0) continue;
      var eased = PS.ease.out(k);
      var flyZ = 6 * eased, rotX = -0.6 * eased;
      var panel = [
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2, PANEL_H/2, frontZ + PANEL_TH/2 + flyZ),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2, PANEL_H/2, frontZ + PANEL_TH/2 + flyZ),
        S.project(pxPos + PANEL_W/2 - PANEL_GAP/2, -PANEL_H/2, frontZ + PANEL_TH/2 + flyZ),
        S.project(pxPos - PANEL_W/2 + PANEL_GAP/2, -PANEL_H/2, frontZ + PANEL_TH/2 + flyZ)
      ];
      var face = ctx.createLinearGradient(0, panel[0][1], 0, panel[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER, 0.10)); face.addColorStop(1, PS.darken(TIMBER_D, 0.20));
      S.poly(panel, face, PS.rgba(TIMBER_D, 0.5), 1 - eased * 0.3);
      S.texture(panel, 'streak', 80, 0.05);
      S.shadow(pxPos, frontZ + flyZ, PANEL_W/2, PANEL_H/2, 0.3 * (1 - eased));
    }

    /* Top walers & props fall */
    if (tProps > 0) {
      var eased = PS.ease.out(tProps);
      var fallY = -4 * eased;
      var twBack = [
        S.project(-FW/2, FH + fallY, backZ - PANEL_TH/2),
        S.project(FW/2, FH + fallY, backZ - PANEL_TH/2),
        S.project(FW/2, FH + fallY, backZ + PANEL_TH/2),
        S.project(-FW/2, FH + fallY, backZ + PANEL_TH/2)
      ];
      var face = ctx.createLinearGradient(0, twBack[0][1], 0, twBack[2][1]);
      face.addColorStop(0, PS.lighten(TIMBER_D, 0.08)); face.addColorStop(1, PS.darken(TIMBER_D, 0.15));
      S.poly(twBack, face, PS.rgba(TIMBER_D, 0.6), 1 - eased);
      S.poly([
        S.project(-FW/2, FH + fallY, frontZ - PANEL_TH/2),
        S.project(FW/2, FH + fallY, frontZ - PANEL_TH/2),
        S.project(FW/2, FH + fallY, frontZ + PANEL_TH/2),
        S.project(-FW/2, FH + fallY, frontZ + PANEL_TH/2)
      ], face, PS.rgba(TIMBER_D, 0.6), 1 - eased);
    }

    /* Final: board grain texture on revealed concrete face */
    if (tFinal > 0) {
      var conc = [
        S.project(-WALL_W/2 + WALL_D/2, WALL_H/2, 0),
        S.project(WALL_W/2 - WALL_D/2, WALL_H/2, 0),
        S.project(WALL_W/2 - WALL_D/2, -WALL_H/2, 0),
        S.project(-WALL_W/2 + WALL_D/2, -WALL_H/2, 0)
      ];
      var baseCol = CONC_DRY;
      var g = ctx.createLinearGradient(0, conc[0][1], 0, conc[2][1]);
      g.addColorStop(0, PS.lighten(baseCol, 0.08));
      g.addColorStop(0.5, baseCol);
      g.addColorStop(1, PS.darken(baseCol, 0.12));
      S.poly(conc, g, null, 1);
      S.mottle(conc, baseCol, 0.06, 18);
      S.texture(conc, 'aggregate', 240, 0.03);
      S.texture(conc, 'streak', 180, 0.025);
      S.rim(conc[0], conc[1], 'rgba(255,255,255,.5)', 1, 2.5);
      S.rim(conc[1], conc[2], 'rgba(255,255,255,.3)', 0.7, 1.8);

      /* Board grain lines — horizontal streaks across face */
      ctx.save();
      ctx.beginPath(); ctx.moveTo(conc[0][0], conc[0][1]); ctx.lineTo(conc[1][0], conc[1][1]);
      ctx.lineTo(conc[2][0], conc[2][1]); ctx.lineTo(conc[3][0], conc[3][1]); ctx.closePath(); ctx.clip();
      var gy, gyEnd = conc[2][1], gyStart = conc[0][1], gxStart = conc[0][0], gxEnd = conc[1][0];
      for (gy = gyStart; gy < gyEnd; gy += (gyEnd - gyStart) / 28) {
        var a = S.project(-WALL_W/2 + 0.05, (gy - gyStart) / (gyEnd - gyStart) * WALL_H - WALL_H/2, 0);
        var b = S.project(WALL_W/2 - 0.05, (gy - gyStart) / (gyEnd - gyStart) * WALL_H - WALL_H/2, 0);
        ctx.strokeStyle = PS.rgba(BOARD_GRAIN, 0.18 * tFinal);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      ctx.restore();

      /* Scale cue — person */
      S.scaleCue(-WALL_W/2 - 1.2, 6, 'person');
    }
  }

  /* ---------- FRAME / HUD ---------- */
  function frame(S_, p, time) {
    S = S_;
    env(time);
    drawSubject(p, time);
    grade(time);
    var idx = p < 0.10 ? 0 : p < 0.32 ? 1 : p < 0.56 ? 2 : p < 0.70 ? 3 : p < 0.85 ? 4 : p < 0.94 ? 5 : 6;
    var labels = ['Ground & set-out', 'Base plates', 'Back panels', 'Side walls', 'Front wall', 'Top walers & ties', 'Concrete placed', 'Strike begins', 'Sides peel', 'Front strikes', 'Props fall', 'Finished wall'];
    if (stgNum) stgNum.textContent = idx < 9 ? '0' + (idx + 1) : String(idx + 1);
    if (stgName) stgName.textContent = labels[Math.min(idx, labels.length - 1)];
    if (railFill) railFill.style.height = Math.round(p * 100) + '%';
    if (heroCopy) {
      var ho = PS.clamp(1 - p * 1.5, 0, 1);
      heroCopy.style.opacity = ho;
      heroCopy.style.transform = 'translateY(' + (p * 15) + 'px)';
    }
    var hint = document.getElementById('scrollHint');
    if (hint) hint.style.opacity = PS.clamp(1 - p * 6, 0, 1);
  }

  S.start();
})();