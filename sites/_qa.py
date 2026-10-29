import sys, os, json
from playwright.sync_api import sync_playwright

slug = sys.argv[1]
base = f"/home/ogheesus/laydback-site/sites/{slug}"
url = "file://" + os.path.join(base, "index.html")
outdir = os.path.join(base, "qa")
os.makedirs(outdir, exist_ok=True)

results = {"slug": slug, "checks": {}, "errors": [], "warnings": []}

def run(width, height, label, shot=None):
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
        page = ctx.new_page()
        console = []
        page.on("console", lambda m: console.append((m.type, m.text)) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: console.append(("pageerror", str(e))))
        page.goto(url, wait_until="load")
        page.wait_for_timeout(600)
        # trigger lazy images by scrolling through the page
        page.evaluate("""async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r=>setTimeout(r,150)); }
          window.scrollTo(0,0);
        }""")
        page.wait_for_timeout(1000)
        try:
            page.wait_for_function("""() => [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth>0)""", timeout=15000)
        except Exception:
            pass
        page.wait_for_timeout(600)
        info = page.evaluate("""() => {
          const imgs = [...document.querySelectorAll('img')].map(i => ({
            src: (i.currentSrc||i.src).split('/').pop(),
            nw: i.naturalWidth, nh: i.naturalHeight,
            rw: Math.round(i.getBoundingClientRect().width),
            rh: Math.round(i.getBoundingClientRect().height),
            complete: i.complete
          }));
          const brand = document.querySelector('.brand');
          const brandText = brand ? brand.textContent.trim() : null;
          const navin = document.querySelector('.nav-in');
          const brandImgs = brand ? [...brand.querySelectorAll('img')] : [];
          const markImg = brandImgs[0] || null;
          const wordImg = brandImgs[1] || brandImgs[0] || null;
          return {
            scrollW: document.documentElement.scrollWidth,
            innerW: window.innerWidth,
            imgs,
            brandText,
            navHeight: navin ? Math.round(navin.getBoundingClientRect().height) : null,
            markW: markImg ? Math.round(markImg.getBoundingClientRect().width) : 0,
            wordW: wordImg ? Math.round(wordImg.getBoundingClientRect().width) : 0,
            brandImgs: brandImgs.length,
            bodyText: document.body.innerText.slice(0,0)
          };
        }""")
        # horizontal overflow at this viewport
        overflow = info["scrollW"] - info["innerW"]
        results["checks"][f"overflow_{label}"] = {"scrollW": info["scrollW"], "innerW": info["innerW"], "delta": overflow, "ok": overflow <= 2}
        broken = [i for i in info["imgs"] if i["nw"] == 0]
        results["checks"][f"broken_{label}"] = {"broken": broken, "ok": len(broken) == 0}
        up = [i for i in info["imgs"] if i["nw"] > 0 and i["rw"] > i["nw"] + 1]
        results["checks"][f"upscaled_{label}"] = {"upscaled": up, "ok": len(up) == 0}
        results["checks"][f"brand_{label}"] = {"brandText": info["brandText"], "markW": info["markW"], "wordW": info["wordW"],
                                               "ok": (info["brandText"] == "" and info["markW"] > 0 and info["wordW"] > 0)}
        results["checks"][f"navheight_{label}"] = info["navHeight"]
        results["checks"][f"console_{label}"] = {"events": console, "ok": len([c for c in console if c[0] in ("error", "pageerror")]) == 0}
        results["errors"] += [c for c in console if c[0] in ("error", "pageerror")]
        if shot:
            page.screenshot(path=os.path.join(outdir, shot), clip={"x": 0, "y": 0, "width": width, "height": min(height, 1000)})
        b.close()

run(1440, 900, "1440", "top-1440.png")
run(390, 844, "390", "top-390.png")

# full page screenshot at 1440 for overall look
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(url, wait_until="load")
    page.wait_for_timeout(800)
    # force reveal
    page.evaluate("document.querySelectorAll('.rise').forEach(e=>e.classList.add('on'))")
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(outdir, "full-1440.png"), full_page=True)
    page2 = ctx.new_page()
    page2.set_viewport_size({"width": 390, "height": 844})
    page2.goto(url, wait_until="load")
    page2.wait_for_timeout(800)
    page2.evaluate("document.querySelectorAll('.rise').forEach(e=>e.classList.add('on'))")
    page2.screenshot(path=os.path.join(outdir, "full-390.png"), full_page=True)
    b.close()

print(json.dumps(results, indent=1)[:6000])
