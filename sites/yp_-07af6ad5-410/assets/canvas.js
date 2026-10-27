(() => {
  const canvas = document.getElementById('bore-log-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Colours
  const BG = '#221b14';
  const VERDIGRIS = '#55907a';
  const BONE = '#ece3d3';
  const DARK = '#221b14';

  // Column geometry
  const colX = w * 0.35;
  const colW = w * 0.3;
  const colY = h * 0.08;
  const colH = h * 0.84;
  const rx = 8;

  // Strata boundaries (as fractions of column height)
  // Topsoil 0-0.15, Clay 0.15-0.35, Gravel 0.35-0.55, Sand 0.55-0.7, Rock 0.7-1.0
  const strata = [
    { y0: 0, y1: 0.15, fill: VERDIGRIS, pattern: 'soil' },
    { y0: 0.15, y1: 0.35, fill: VERDIGRIS, pattern: 'clay' },
    { y0: 0.35, y1: 0.55, fill: VERDIGRIS, pattern: 'gravel' },
    { y0: 0.55, y1: 0.70, fill: VERDIGRIS, pattern: 'sand' },
    { y0: 0.70, y1: 1.0, fill: VERDIGRIS, pattern: 'rock' },
  ];

  // Clear
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Draw column background
  ctx.fillStyle = VERDIGRIS;
  roundRect(ctx, colX, colY, colW, colH, rx);
  ctx.fill();

  // Strata fills with patterns
  strata.forEach(s => {
    const y0 = colY + s.y0 * colH;
    const y1 = colY + s.y1 * colH;
    const sh = y1 - y0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(colX, y0, colW, sh);
    ctx.clip();

    // Base fill
    ctx.fillStyle = s.fill;
    ctx.fillRect(colX, y0, colW, sh);

    // Pattern overlays
    ctx.fillStyle = DARK;
    ctx.globalAlpha = 0.6;

    switch (s.pattern) {
      case 'soil': // Speckles
        for (let i = 0; i < 40; i++) {
          const px = colX + 8 + Math.random() * (colW - 16);
          const py = y0 + 8 + Math.random() * (sh - 16);
          const r = 2 + Math.random() * 3;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'clay': // Horizontal lines
        for (let y = y0 + 8; y < y1; y += 10) {
          ctx.fillRect(colX + 8, y, colW - 16, 1.5);
        }
        break;
      case 'gravel': // Pellets
        for (let i = 0; i < 35; i++) {
          const px = colX + 10 + Math.random() * (colW - 20);
          const py = y0 + 10 + Math.random() * (sh - 20);
          const r = 3 + Math.random() * 3;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'sand': // Fine horizontal dashes
        for (let y = y0 + 6; y < y1; y += 8) {
          for (let x = colX + 10; x < colX + colW - 10; x += 24) {
            ctx.fillRect(x, y, 16, 1.5);
          }
        }
        break;
      case 'rock': // Tight horizontal hatching
        for (let y = y0 + 4; y < y1; y += 6) {
          ctx.fillRect(colX + 8, y, colW - 16, 1);
        }
        break;
    }
    ctx.restore();
  });

  // Strata division lines
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 3;
  strata.slice(0, -1).forEach(s => {
    const y = colY + s.y1 * colH;
    ctx.beginPath();
    ctx.moveTo(colX, y);
    ctx.lineTo(colX + colW, y);
    ctx.stroke();
  });

  // Column border
  ctx.strokeStyle = VERDIGRIS;
  ctx.lineWidth = 4;
  ctx.beginPath();
  roundRect(ctx, colX, colY, colW, colH, rx);
  ctx.stroke();

  // Depth ticks on left
  ctx.fillStyle = VERDIGRIS;
  const tickX = colX - 24;
  [0, 0.15, 0.35, 0.55, 0.70, 1.0].forEach((frac, i) => {
    const y = colY + frac * colH;
    ctx.fillRect(tickX, y - 2, 16, 4);
    // Depth label
    ctx.font = 'bold 14px "Martian Mono", monospace';
    ctx.fillStyle = VERDIGRIS;
    ctx.textAlign = 'right';
    ctx.fillText((frac * 2).toFixed(1), tickX - 8, y + 5);
  });

  // Excavator bucket at top
  ctx.fillStyle = BONE;
  const bucketY = colY - 12;
  ctx.beginPath();
  ctx.moveTo(colX + colW * 0.5, bucketY - 16);
  ctx.lineTo(colX + colW * 0.3, bucketY);
  ctx.lineTo(colX + colW * 0.3, bucketY + 24);
  ctx.quadraticCurveTo(colX + colW * 0.3, bucketY + 32, colX + colW * 0.5, bucketY + 32);
  ctx.lineTo(colX + colW * 0.7, bucketY + 32);
  ctx.quadraticCurveTo(colX + colW * 0.7, bucketY + 24, colX + colW * 0.7, bucketY + 24);
  ctx.lineTo(colX + colW * 0.7, bucketY);
  ctx.closePath();
  ctx.fill();

  // Bucket teeth
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.moveTo(colX + colW * 0.4, bucketY + 32);
  ctx.lineTo(colX + colW * 0.5, bucketY + 40);
  ctx.lineTo(colX + colW * 0.6, bucketY + 32);
  ctx.closePath();
  ctx.fill();

  // JW Monogram in center of column
  const monoX = colX + colW * 0.5;
  const monoY = colY + colH * 0.5;
  ctx.fillStyle = BONE;

  // J - vertical stem with hook
  ctx.beginPath();
  ctx.rect(monoX - 10, monoY - 20, 8, 40); // stem
  ctx.rect(monoX - 14, monoY + 20, 8, 12); // hook left
  ctx.fill();

  // W - two V's
  ctx.beginPath();
  // First V
  ctx.moveTo(monoX + 6, monoY + 20);
  ctx.lineTo(monoX + 16, monoY - 20);
  ctx.lineTo(monoX + 26, monoY + 20);
  ctx.lineTo(monoX + 16, monoY + 4);
  ctx.closePath();
  // Second V
  ctx.moveTo(monoX + 26, monoY + 20);
  ctx.lineTo(monoX + 36, monoY - 20);
  ctx.lineTo(monoX + 46, monoY + 20);
  ctx.lineTo(monoX + 36, monoY + 4);
  ctx.closePath();
  // Connect bottom
  ctx.rect(monoX + 16, monoY + 20, 20, 8);
  ctx.fill();

  // Side annotation marks on right
  ctx.fillStyle = BONE;
  const markX = colX + colW + 16;
  [0.2, 0.4, 0.6].forEach(frac => {
    const y = colY + frac * colH;
    roundRect(ctx, markX, y - 4, 20, 8, 3);
    ctx.fill();
  });

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
})();
