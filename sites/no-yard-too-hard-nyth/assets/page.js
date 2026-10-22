(function () {
  "use strict";
  function fit(cv) {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * d));
    cv.height = Math.max(1, Math.round(r.height * d));
    var ctx = cv.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  /* stepped terrace profile: retaining levels + planting marks */
  function terraces(cv, faint) {
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    var f = fit(cv), ctx = f.ctx, w = f.w, h = f.h;
    var pad = w * 0.07, base = h * 0.74, levels = 5, i, k;
    ctx.clearRect(0, 0, w, h);
    for (i = 0; i < 5; i++) {
      var y = base - i * h * 0.115, inset = pad + i * w * 0.055;
      ctx.fillStyle = i % 2 ? "rgba(76,107,63," + (faint ? 0.10 : 0.16) + ")"
                            : "rgba(96,0,24," + (faint ? 0.10 : 0.14) + ")";
      ctx.fillRect(inset, y, w - inset * 2, h * 0.028);
      ctx.strokeStyle = "rgba(23,21,15,0.20)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(inset, y + h * 0.028);
      ctx.lineTo(inset, y + h * 0.115);
      ctx.stroke();
      for (k = 0; k < 4; k++) {
        var x = inset + w * 0.14 + k * (w - inset * 2) / 4.6;
        ctx.beginPath();
        ctx.arc(x, y - h * 0.03, Math.max(1.6, w * 0.0045), 0, 6.2832);
        ctx.fillStyle = k % 2 ? "rgba(76,107,63,0.55)" : "rgba(96,0,24,0.5)";
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(23,21,15,0.30)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad * 0.5, base + h * 0.09);
    ctx.lineTo(w - pad * 0.5, base + h * 0.09);
    ctx.stroke();
  }
  function draw() {
    terraces(document.getElementById("detailCanvas"), false);
    terraces(document.querySelector("header .lb-hero-canvas"), true);
  }
  var rt;
  addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 180); }, { passive: true });
  addEventListener("load", draw);
  if (document.readyState !== "loading") draw(); else addEventListener("DOMContentLoaded", draw);
  setTimeout(draw, 500);

  /* rotation band */
  var band = document.querySelector(".lb-rb");
  if (!band) return;
  var slides = [].slice.call(band.querySelectorAll(".lb-rb__slide"));
  var dots = [].slice.call(band.querySelectorAll(".lb-rb__dots button"));
  var prev = band.querySelector(".lb-rb__nav--prev");
  var next = band.querySelector(".lb-rb__nav--next");
  if (slides.length < 2) return;
  var idx = 0, timer = null, hover = false;
  function go(n) {
    idx = (n + slides.length) % slides.length;
    slides.forEach(function (s, j) { s.classList.toggle("is-on", j === idx); });
    dots.forEach(function (d, j) {
      d.classList.toggle("is-on", j === idx);
      if (j === idx) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
  }
  function start() { stop(); timer = setInterval(function () { if (!hover) go(idx + 1); }, 4800); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  if (next) next.addEventListener("click", function () { go(idx + 1); start(); });
  if (prev) prev.addEventListener("click", function () { go(idx - 1); start(); });
  dots.forEach(function (d, j) { d.addEventListener("click", function () { go(j); start(); }); });
  band.addEventListener("mouseenter", function () { hover = true; });
  band.addEventListener("mouseleave", function () { hover = false; });
  band.addEventListener("focusin", function () { hover = true; });
  band.addEventListener("focusout", function () { hover = false; });
  start();
})();
