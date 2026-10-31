#!/usr/bin/env python3
"""Playwright QA gate for a lead site. Usage: qa_stackE.py <url> [shot_prefix]"""
import sys, json
from playwright.sync_api import sync_playwright

url = sys.argv[1]
prefix = sys.argv[2] if len(sys.argv) > 2 else "/tmp/qa"

out = {"url": url, "errors": [], "imgs": [], "overflow": {}, "logo": None, "brand_text": None}
console = []

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for w, h, tag in [(1440, 900, "1440"), (390, 844, "390")]:
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.on("console", lambda m: console.append(f"{tag}:{m.type}:{m.text[:200]}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: console.append(f"{tag}:pageerror:{str(e)[:200]}"))
        pg.goto(url, wait_until="networkidle", timeout=45000)
        pg.wait_for_timeout(1200)
        ov = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        out["overflow"][tag] = ov
        if tag == "1440":
            out["imgs"] = pg.evaluate("""() => [...document.querySelectorAll('img')].map(i => ({
                src: i.getAttribute('src'), nw: i.naturalWidth, nh: i.naturalHeight,
                rw: Math.round(i.getBoundingClientRect().width),
                upscaled: i.naturalWidth>0 && i.getBoundingClientRect().width > i.naturalWidth + 1 }))""")
            out["logo"] = pg.evaluate("""() => { const e=document.querySelector('.brand__mark,.brand svg,.nav__logo,.brand img');
                if(!e) return null; const r=e.getBoundingClientRect(); return {tag:e.tagName, w:Math.round(r.width), h:Math.round(r.height)}; }""")
            out["brand_text"] = pg.evaluate("""() => { const b=document.querySelector('.brand'); return b ? b.innerText.trim() : null; }""")
        pg.screenshot(path=f"{prefix}-{tag}.png", full_page=False)
        if tag == "1440":
            pg.screenshot(path=f"{prefix}-full.png", full_page=True)
        pg.close()
    b.close()

out["errors"] = console
print(json.dumps(out, indent=1))
