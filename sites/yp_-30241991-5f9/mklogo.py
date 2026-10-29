#!/usr/bin/env python3
"""
mklogo.py - generate the header logo artwork for Robert's Painting Services
(Painting, Central Coast).

Concept: a rounded "paint chip" badge in the brand's steel blue carrying a bold
monogram R, undercut by a tapered sky-blue brush swipe that runs across the bottom of
the badge - a painted R, not just stock initials. The wordmark ("ROBERT'S" over
"PAINTING SERVICES") is set in Manrope (the site's own sans) converted to OUTLINES, so
the .svg files carry no live text and need no font at runtime.

Outputs (assets/):
  logo-mark.svg / @2x.png      badge + swipe + R
  logo-word.svg / @2x.png      stacked wordmark
  logo-header.svg / @2x.png    horizontal lockup (mark + wordmark) - the header artwork
  palette.json                 palette sampled off the rendered artwork

Run:  /home/ogheesus/personal-autogtm/.venv/bin/python mklogo.py
"""
import json, os, re, subprocess, sys, urllib.request
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONTS = os.environ.get("MKLOGO_FONTS", "/home/ogheesus/.hermes/cache/scratch/fonts")
os.makedirs(ASSETS, exist_ok=True); os.makedirs(FONTS, exist_ok=True)

# ---------------------------------------------------------------- palette
BRAND   = "#2F6F92"   # steel blue  -> --brand / --accent
DEEP    = "#16374A"   # navy         -> --ink / --deep
SKY     = "#8FC7E0"   # sky blue     -> --acc (brush swipe)
ONBRAND = "#FFFFFF"   # white monogram
PAPER   = "#F2F7F9"   # the logo's ground plate -> --bg / --paper

FONTS_NEEDED = {  # filename -> (google family, weight)
    "manrope-500.ttf": ("Manrope", 500),
    "manrope-800.ttf": ("Manrope", 800),
}
GF_URL = "https://fonts.googleapis.com/css2?family=Manrope:wght@{w}&display=swap"

def font_path(name):
    p = os.path.join(FONTS, name)
    if not os.path.exists(p):
        fam, w = FONTS_NEEDED[name]
        css = urllib.request.urlopen(urllib.request.Request(
            GF_URL.format(w=w), headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"})).read().decode()
        url = re.search(r"url\((https://[^)]+\.ttf)\)", css).group(1)
        urllib.request.urlretrieve(url, p)
    return p

_cache = {}
def _font(wt):
    if wt not in _cache:
        tt = TTFont(font_path({500: "manrope-500.ttf", 800: "manrope-800.ttf"}[wt]))
        _cache[wt] = (tt, tt.getGlyphSet(), tt["head"].unitsPerEm, tt.getBestCmap(),
                      tt["hmtx"], tt["OS/2"].sCapHeight)
    return _cache[wt]

def run(wt, text, size, x0, y0, tracking=0.0):
    tt, gs, upm, cmap, hmtx, cap = _font(wt)
    scale = size / upm
    d, x = [], x0
    xmin = ymin = 1e9; xmax = ymax = -1e9
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += size * 0.3; continue
        adv = hmtx[gn][0] * scale
        if ch != " ":
            sp = SVGPathPen(gs)
            gs[gn].draw(TransformPen(sp, Transform(scale, 0, 0, -scale, x, y0)))
            c = sp.getCommands()
            if c: d.append(c)
            bp = BoundsPen(gs)
            gs[gn].draw(TransformPen(bp, Transform(scale, 0, 0, -scale, x, y0)))
            if bp.bounds:
                bx0, by0, bx1, by1 = bp.bounds
                xmin, ymin = min(xmin, bx0), min(ymin, by0)
                xmax, ymax = max(xmax, bx1), max(ymax, by1)
        x += adv + tracking * size
    return " ".join(d), x, (xmin, ymin, xmax, ymax)

def cap_ratio(wt):
    tt, gs, upm, cmap, hmtx, cap = _font(wt)
    return cap / upm

def svg(w, h, body, vb=None, label="Robert's Painting Services"):
    vb = vb or f"0 0 {w} {h}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
            f'aria-label="{label}">\n{body}\n</svg>\n')

# ---------------------------------------------------------------- symbol
BOX = 128
def mark_inner():
    r = 30
    return (
      f'<defs><clipPath id="badge"><rect x="0" y="0" width="{BOX}" height="{BOX}" rx="{r}"/>'
      f'</clipPath></defs>\n'
      f'  <rect x="0" y="0" width="{BOX}" height="{BOX}" rx="{r}" fill="{BRAND}"/>\n'
      f'  <g clip-path="url(#badge)">\n'
      f'    <path d="M4 106 C44 94 84 100 124 84 L124 102 C84 118 44 112 4 120 Z" fill="{SKY}"/>\n'
      f'  </g>\n'
      f'  {R_PATH}'
    )

# monogram R, centred, cap height 56, baseline y=78
CAP_TARGET = 56.0
R_BASE = 78.0
_em = CAP_TARGET / cap_ratio(800)
_rd, _rx, _rbb = run(800, "R", _em, 0.0, R_BASE)
_rx0 = (BOX - (_rbb[2] - _rbb[0])) / 2 - _rbb[0]
R_PATH = f'<path d="{run(800, "R", _em, _rx0, R_BASE)[0]}" fill="{ONBRAND}"/>'

def mark_svg():
    return svg(BOX, BOX, "  " + mark_inner())

# ---------------------------------------------------------------- wordmark (stacked)
L1 = (800, "ROBERT\u2019S", 100, 0.0, 100.0, 0.005)
L2 = (500, "PAINTING SERVICES", 47, 0.0, 150.0, 0.16)
def _wm_parts():
    d1, x1, b1 = run(*L1)
    d2, x2, b2 = run(*L2)
    xmin = min(b1[0], b2[0]); xmax = max(x1, x2)
    top = min(b1[1], b2[1]); bot = max(b1[3], b2[3])
    return dict(d1=d1, d2=d2, xmin=xmin, xmax=xmax, top=top, bot=bot)

def _word_body():
    p = _wm_parts()
    g = (f'<g><path d="{p["d1"]}" fill="{DEEP}"/>'
         f'<path d="{p["d2"]}" fill="{BRAND}"/></g>')
    return g, p

def word_svg():
    pad = 4
    g, p = _word_body()
    w = p["xmax"] - p["xmin"] + 2 * pad
    h = p["bot"] - p["top"] + 2 * pad
    vb = f'{p["xmin"]-pad:.1f} {p["top"]-pad:.1f} {w:.1f} {h:.1f}'
    return svg(w, h, "  " + g, vb=vb), p

def lockup_svg(wp):
    pad = 4
    wm_w = wp["xmax"] - wp["xmin"] + 2 * pad
    wm_h = wp["bot"] - wp["top"] + 2 * pad
    gap = 20
    total_w = BOX + gap + wm_w
    total_h = max(BOX, wm_h)
    # mark vertically centred on the wordmark block
    my = (total_h - BOX) / 2
    body = (f'<g transform="translate(0,{my:.1f})">{mark_inner()}</g>\n'
            f'  <g transform="translate({-(wp["xmin"]-pad)+BOX+gap:.1f},'
            f'{-(wp["top"]-pad)+(total_h-wm_h)/2:.1f})">{_word_body()[0]}</g>')
    return svg(total_w, total_h, body)

# ---------------------------------------------------------------- render + sample
import cairosvg
def render(svg_text, out, scale=3):
    cairosvg.svg2png(bytestring=svg_text.encode(), write_to=out, scale=scale)

def main():
    mark = mark_svg()
    word, wp = word_svg()
    lock = lockup_svg(wp)
    open(os.path.join(ASSETS, "logo-mark.svg"), "w").write(mark)
    open(os.path.join(ASSETS, "logo-word.svg"), "w").write(word)
    open(os.path.join(ASSETS, "logo-header.svg"), "w").write(lock)
    render(mark, os.path.join(ASSETS, "logo-mark@2x.png"))
    render(word, os.path.join(ASSETS, "logo-word@2x.png"))
    render(lock, os.path.join(ASSETS, "logo-header@2x.png"))
    print("wrote svg + png")

    from PIL import Image
    from collections import Counter
    # (a) artwork inks, transparent ground
    im = Image.open(os.path.join(ASSETS, "logo-header@2x.png")).convert("RGBA")
    px = im.load(); c = Counter()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a >= 200:
                c[(r, g, b)] += 1
    print("artwork inks (alpha>=200):")
    for (r, g, b), n in c.most_common(8):
        print(f"  #{r:02X}{g:02X}{b:02X}  {n:>7}")
    # (b) paper: the lockup's own ground plate
    plate = Image.new("RGB", (im.width + 60, im.height + 60), PAPER)
    plate.paste(im, (30, 30), im)
    plate.save("/tmp/yp_plate.png")
    print("paper plate:", PAPER)

    dom = [f"#{r:02X}{g:02X}{b:02X}" for (r, g, b), n in c.most_common(4)]
    pal = {
        "source": "assets/logo-header@2x.png (rendered from logo-header.svg)",
        "paper": PAPER, "accent": BRAND, "accent_sky": SKY, "ink": DEEP, "on_brand": ONBRAND,
        "dominant_sampled": dom,
        "sampled_pixels": {f"#{r:02X}{g:02X}{b:02X}": n for (r, g, b), n in c.most_common(4)},
    }
    json.dump(pal, open(os.path.join(ASSETS, "palette.json"), "w"), indent=1)
    print("palette.json written")

main()
