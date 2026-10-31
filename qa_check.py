#!/usr/bin/env python3
"""Playwright QA gate for lead sites. Usage: qa_check.py <url> <outdir> [brand-name-regex] """
import sys, os, json
from playwright.sync_api import sync_playwright

url = sys.argv[1]
out = sys.argv[2]
brand = sys.argv[3] if len(sys.argv) > 3 else ""
os.makedirs(out, exist_ok=True)

report = {"url": url, "img_broken": [], "img_upscaled": [], "overflow": {}, "console_errors": [], "logo": {}, "brand_text": None}

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    for w, h, tag in [(1440, 900, "desktop"), (390, 844, "mobile")]:
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(url, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(1500)
        # scroll to trigger lazy images
        page.evaluate("async () => { for (let y=0; y<document.body.scrollHeight; y+=400){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,120)); } window.scrollTo(0,0); }")
        page.wait_for_timeout(600)
        page.evaluate("""async () => { await Promise.all([...document.querySelectorAll('img')].map(im => im.decode().catch(()=>{}))); }""")
        page.wait_for_timeout(400)
        imgs = page.evaluate("""() => [...document.querySelectorAll('img')].map(im => ({
            src: im.currentSrc || im.src, nw: im.naturalWidth, nh: im.naturalHeight,
            w: Math.round(im.getBoundingClientRect().width), vis: im.offsetParent!==null
        }))""")
        for im in imgs:
            base = im["src"].split("/")[-1].split("?")[0]
            if im["nw"] == 0:
                report["img_broken"].append({"page": tag, "src": base, "vis": im["vis"]})
            elif im["w"] > im["nw"] + 1:
                report["img_upscaled"].append({"page": tag, "src": base, "box": im["w"], "native": im["nw"]})
        sw = page.evaluate("document.documentElement.scrollWidth")
        iw = page.evaluate("window.innerWidth")
        report["overflow"][tag] = {"scrollWidth": sw, "innerWidth": iw, "ok": sw <= iw + 2}
        report["console_errors"].extend([{"page": tag, "e": e} for e in errs])
        # header logo check
        logo = page.evaluate("""() => {
            const el = document.querySelector('.nav .brand img, .nav .brand svg, .brand img, .brand svg');
            if (!el) return {found:false};
            const r = el.getBoundingClientRect();
            return {found:true, tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height)};
        }""")
        report["logo"][tag] = logo
        brandtxt = page.evaluate("""() => {
            const b = document.querySelector('.nav .brand, .brand');
            if (!b) return null;
            return (b.innerText || '').trim();
        }""")
        report["brand_text"] = brandtxt
        page.screenshot(path=os.path.join(out, f"top-{tag}.png"))
        page.close()
    browser.close()

print(json.dumps(report, indent=2))
