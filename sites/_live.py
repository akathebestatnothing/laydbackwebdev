import sys, os, json
from playwright.sync_api import sync_playwright

url = sys.argv[1]
slug = sys.argv[2]
outdir = f"/home/ogheesus/laydback-site/sites/{slug}/qa"
os.makedirs(outdir, exist_ok=True)
res = {"url": url}
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    console = []
    page.on("console", lambda m: console.append((m.type, m.text)) if m.type in ("error",) else None)
    page.on("pageerror", lambda e: console.append(("pageerror", str(e))))
    page.goto(url, wait_until="load")
    page.wait_for_timeout(1500)
    page.evaluate("""async () => { const h=document.body.scrollHeight;
      for(let y=0;y<h;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,150));} window.scrollTo(0,0);}""")
    page.wait_for_timeout(1200)
    try:
        page.wait_for_function("()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)", timeout=15000)
    except Exception: pass
    info = page.evaluate("""() => ({
      title: document.title,
      imgs: [...document.querySelectorAll('img')].map(i=>({s:(i.currentSrc||i.src).split('/').pop(),nw:i.naturalWidth,rw:Math.round(i.getBoundingClientRect().width)})),
      scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
      brandText: (document.querySelector('.brand')||{}).textContent.trim()
    })""")
    res["img_ok"] = all(i["nw"]>0 for i in info["imgs"]) and all(i["rw"]<=i["nw"]+1 for i in info["imgs"])
    res["imgs"] = info["imgs"]
    res["overflow"] = info["scrollW"] - info["innerW"]
    res["brandText"] = info["brandText"]
    res["console_errors"] = [c for c in console if c[0]=="error"]
    page.screenshot(path=os.path.join(outdir, "live-top-1440.png"))
    # mobile
    page.set_viewport_size({"width":390,"height":844})
    page.reload(wait_until="load"); page.wait_for_timeout(1000)
    page.evaluate("document.querySelectorAll('.rise').forEach(e=>e.classList.add('on'))")
    page.screenshot(path=os.path.join(outdir, "live-top-390.png"))
    res["overflow_390"] = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    b.close()
print(json.dumps(res)[:1500])
