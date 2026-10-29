#!/usr/bin/env python3
"""Stack A lead-site generator. Writes index.html for one slug from a config dict."""
import os, sys, html

TPL = """<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{ogtitle}">
<meta property="og:description" content="{ogdesc}">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/hero.jpg">
<meta name="theme-color" content="{ink}">
<link rel="icon" href="assets/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="assets/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={fontq}&display=swap" rel="stylesheet">
<style>
:root{{
  --paper:{paper}; --paper-2:{paper2}; --ink:{ink}; --muted:{muted};
  --tan:{tan}; --tan-deep:{tandeep}; --tan-soft:{tansoft};
  --line:rgba(20,18,15,.14); --line-2:rgba(20,18,15,.28); --dark:{dark}; --dark-2:{dark2};
  --font-d:'{fontd}',system-ui,sans-serif; --font-b:'{fontb}',system-ui,-apple-system,sans-serif;
  --gut:clamp(20px,5vw,64px); --max:1280px;
}}
*{{box-sizing:border-box}}
html{{scroll-behavior:smooth}}
body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-b);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}}
img{{max-width:100%;display:block}}
a{{color:inherit}}
h1,h2,h3{{font-family:var(--font-d);font-weight:700;line-height:1.05;letter-spacing:-.02em;margin:0}}
p{{margin:0}}
.wrap{{max-width:var(--max);margin:0 auto;padding:0 var(--gut)}}
.eyebrow{{font-family:var(--font-d);font-size:.72rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--tan-deep)}}

/* nav */
.nav{{position:sticky;top:0;z-index:50;background:rgba(248,245,240,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}}
.nav-in{{max-width:var(--max);margin:0 auto;padding:0 var(--gut);height:88px;display:flex;align-items:center;justify-content:space-between;gap:24px}}
.brand{{display:flex;align-items:center;gap:14px;text-decoration:none}}
.brand img.mark{{height:46px;width:auto}}
.brand img.word{{height:35px;width:auto}}
.brand img.lockup{{height:52px;width:auto}}
.foot .flock img.lockup{{height:44px;width:auto}}
.nav-links{{display:flex;gap:clamp(16px,2.2vw,34px);list-style:none;margin:0;padding:0}}
.nav-links a{{font-family:var(--font-d);font-size:.78rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;color:var(--ink);padding:6px 0;border-bottom:1px solid transparent;transition:border-color .2s,color .2s}}
.nav-links a:hover{{border-color:var(--tan);color:var(--tan-deep)}}
.nav-tel{{display:inline-flex;align-items:center;gap:.5rem;background:var(--ink);color:var(--paper);text-decoration:none;
  font-family:var(--font-d);font-weight:700;font-size:.86rem;letter-spacing:.04em;padding:14px 20px;transition:background .2s,transform .2s}}
.nav-tel{{white-space:nowrap}}
.nav-tel:hover{{background:var(--tan-deep);transform:translateY(-1px)}}
@media(max-width:900px){{.nav-links{{display:none}}.nav-in{{height:74px}}.brand img.mark{{height:38px}}.brand img.word{{height:28px}}.brand img.lockup{{height:42px}}}}
@media(max-width:520px){{.nav-tel{{padding:11px 12px;font-size:.76rem}}}}
@media(max-width:430px){{.brand img.word{{height:22px}}.brand img.mark{{height:30px}}.brand img.lockup{{height:34px}}.nav-tel{{padding:9px 10px;font-size:.72rem}}}}

/* hero */
.hero{{padding:clamp(40px,6vw,84px) 0 clamp(48px,7vw,96px);border-bottom:1px solid var(--line)}}
.hero-grid{{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(28px,5vw,64px);align-items:center}}
.hero h1{{font-size:clamp(2.5rem,5.4vw,4.5rem);margin:18px 0 0;letter-spacing:-.03em}}
.hero h1 em{{font-style:normal;color:var(--tan-deep)}}
.hero-sub{{max-width:52ch;margin-top:22px;color:var(--muted);font-size:clamp(1rem,1.3vw,1.12rem)}}
.hero-cta{{display:flex;flex-wrap:wrap;gap:14px;margin-top:32px}}
.btn{{display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:700;font-size:.9rem;
  letter-spacing:.03em;text-decoration:none;padding:17px 26px;border:1px solid transparent;transition:transform .2s,background .2s,color .2s,border-color .2s}}
.btn-solid{{background:var(--tan-deep);color:#fff}}
.btn-solid:hover{{background:var(--ink);transform:translateY(-2px)}}
.btn-ghost{{border-color:var(--line-2);color:var(--ink)}}
.btn-ghost:hover{{border-color:var(--ink);transform:translateY(-2px)}}
.hero-trust{{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px;padding:0;list-style:none}}
.hero-trust li{{font-family:var(--font-d);font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);border:1px solid var(--line);padding:8px 12px;border-radius:999px}}
.hero-figure{{position:relative;margin:0 auto;width:100%;max-width:460px;justify-self:end}}
.hero-figure img{{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;background:var(--paper-2)}}
.hero-figure figcaption{{position:absolute;left:0;bottom:0;right:0;padding:16px 18px;color:#fff;font-family:var(--font-d);
  font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;background:linear-gradient(0deg,rgba(12,10,8,.82),rgba(12,10,8,0))}}
.hero-badge{{position:absolute;top:-14px;left:-14px;background:var(--ink);color:var(--paper);padding:12px 16px;
  font-family:var(--font-d);font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase}}
@media(max-width:860px){{.hero-grid{{grid-template-columns:1fr}}.hero-figure{{order:-1;max-width:100%;justify-self:start}}.hero-figure img{{max-width:100%;aspect-ratio:16/11;object-position:center 45%}}.hero-badge{{top:10px;left:10px}}}}

/* section heads */
.sec{{padding:clamp(56px,7vw,104px) 0;border-top:1px solid var(--line)}}
.sec-head{{display:grid;grid-template-columns:auto 1fr;gap:clamp(16px,3vw,40px);align-items:start;margin-bottom:clamp(30px,4vw,54px)}}
.sec-n{{font-family:var(--font-d);font-size:.8rem;font-weight:700;letter-spacing:.1em;color:var(--tan-deep);padding-top:.5rem}}
.sec-head h2{{font-size:clamp(1.9rem,3.6vw,3rem)}}
.sec-head p{{max-width:62ch;margin-top:14px;color:var(--muted)}}

/* services */
.svc{{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--line)}}
.svc article{{padding:clamp(22px,2.6vw,34px);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transition:background .25s}}
.svc article:nth-child(3n){{border-right:0}}
.svc article:nth-last-child(-n+3){{border-bottom:0}}
.svc article:hover{{background:var(--paper-2)}}
.svc .code{{font-family:var(--font-d);font-size:.68rem;font-weight:700;letter-spacing:.2em;color:var(--tan-deep)}}
.svc h3{{font-size:1.22rem;margin:14px 0 10px}}
.svc p{{color:var(--muted);font-size:.96rem}}
@media(max-width:900px){{.svc{{grid-template-columns:repeat(2,1fr)}}.svc article:nth-child(3n){{border-right:1px solid var(--line)}}.svc article:nth-child(2n){{border-right:0}}.svc article:nth-last-child(-n+3){{border-bottom:1px solid var(--line)}}.svc article:nth-last-child(-n+2){{border-bottom:0}}}}
@media(max-width:600px){{.svc{{grid-template-columns:1fr}}.svc article{{border-right:0!important}}.svc article:last-child{{border-bottom:0}}}}

/* process */
.dark{{background:var(--dark);color:#f6f1e9;border-top:0}}
.dark .sec-head p,.dark .step p{{color:rgba(246,241,233,.66)}}
.dark .sec-head h2,.dark h2{{color:#fff}}
.dark .sec-n{{color:var(--tan-soft)}}
.steps{{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(14px,2vw,26px)}}
.step{{border-top:1px solid rgba(246,241,233,.24);padding-top:18px}}
.step .n{{font-family:var(--font-d);font-size:.72rem;font-weight:700;letter-spacing:.2em;color:var(--tan-soft)}}
.step h3{{font-size:1.06rem;margin:10px 0 8px;color:#fff}}
.step p{{font-size:.9rem}}
@media(max-width:980px){{.steps{{grid-template-columns:repeat(2,1fr)}}}}
@media(max-width:560px){{.steps{{grid-template-columns:1fr}}}}

/* work */
.gal{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,1.6vw,20px)}}
.gal figure{{margin:0}}
.gal img{{width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;background:var(--paper-2)}}
.gal figcaption{{margin-top:10px;font-family:var(--font-d);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
@media(max-width:720px){{.gal{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
@media(max-width:460px){{.gal{{grid-template-columns:1fr}}}}

/* why */
.why{{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,2.4vw,30px)}}
.why div{{border-left:2px solid var(--tan);padding-left:18px}}
.why h3{{font-size:1.02rem;margin-bottom:8px}}
.why p{{color:var(--muted);font-size:.94rem}}
@media(max-width:900px){{.why{{grid-template-columns:repeat(2,1fr)}}}}
@media(max-width:560px){{.why{{grid-template-columns:1fr}}}}

/* faq */
.faq{{border-top:1px solid var(--line)}}
.faq details{{border-bottom:1px solid var(--line);padding:0}}
.faq summary{{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:1.2rem;align-items:baseline;
  padding:22px 0;font-family:var(--font-d);font-size:1.06rem;font-weight:600}}
.faq summary::-webkit-details-marker{{display:none}}
.faq summary::after{{content:"+";color:var(--tan-deep);font-size:1.2rem;line-height:1}}
.faq details[open] summary::after{{content:"\\2013"}}
.faq p{{color:var(--muted);padding:0 0 24px;max-width:78ch}}

/* contact */
.contact{{background:var(--dark-2);color:#f6f1e9;border-top:0}}
.contact-grid{{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(28px,4vw,60px);align-items:start}}
.contact h2{{font-size:clamp(2rem,4vw,3.1rem);color:#fff}}
.contact p{{color:rgba(246,241,233,.7);margin-top:16px;max-width:46ch}}
.contact-cta{{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}}
.contact .btn-ghost{{border-color:rgba(246,241,233,.4);color:#fff}}
.contact .btn-ghost:hover{{border-color:#fff}}
.contact dl{{margin:0;display:grid;gap:18px}}
.contact dt{{font-family:var(--font-d);font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--tan-soft)}}
.contact dd{{margin:6px 0 0;color:#f6f1e9;font-size:1.02rem;word-break:break-word}}
.contact dd a{{text-decoration:none;border-bottom:1px solid rgba(246,241,233,.3)}}
.contact dd a:hover{{border-color:var(--tan-soft)}}
@media(max-width:860px){{.contact-grid{{grid-template-columns:1fr}}}}

/* footer */
.foot{{padding:clamp(36px,4vw,56px) 0;background:var(--dark);color:rgba(246,241,233,.62);border-top:1px solid rgba(246,241,233,.12)}}
.foot-in{{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}}
.foot .flock{{display:flex;align-items:center;gap:14px}}
.foot .flock img.mark{{height:40px;width:auto}}
.foot .flock img.word{{height:30px;width:auto}}
.foot p{{font-size:.82rem}}

/* reveal */
.js .rise{{opacity:0;transform:translateY(20px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}}
.js .rise.on{{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}.js .rise{{opacity:1;transform:none;transition:none}}}}
{extra_css}
</style>
</head>
<body>
<header class="nav">
  <div class="nav-in">
    <a class="brand" href="#top" aria-label="{name} home">
      {brand_inner}
    </a>
    <ul class="nav-links">
      <li><a href="#services">What we do</a></li>
      <li><a href="#process">How we work</a></li>
      <li><a href="#work">Our work</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
    <a class="nav-tel" href="tel:{phonetel}">{phone}</a>
  </div>
</header>

<main id="top">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">{eyebrow}</p>
        <h1>{h1}</h1>
        <p class="hero-sub">{sub}</p>
        <div class="hero-cta">
          <a class="btn btn-solid" href="tel:{phonetel}">Call {phone}</a>
          <a class="btn btn-ghost" href="#services">See what we do</a>
        </div>
        <ul class="hero-trust">
          {chips}
        </ul>
      </div>
      <figure class="hero-figure">
        <span class="hero-badge">{badge}</span>
        <img src="assets/{herofile}" alt="{heroalt}" width="{heroiw}" height="{heroih}" fetchpriority="high">
        <figcaption>{herocaption}</figcaption>
      </figure>
    </div>
  </section>

  <section class="sec" id="services">
    <div class="wrap">
      <div class="sec-head rise">
        <span class="sec-n">01</span>
        <div>
          <h2>What we do.</h2>
          <p>{services_intro}</p>
        </div>
      </div>
      <div class="svc rise">
        {svc_cards}
      </div>
    </div>
  </section>

  <section class="sec dark" id="process">
    <div class="wrap">
      <div class="sec-head rise">
        <span class="sec-n">02</span>
        <div>
          <h2>How a job runs.</h2>
          <p>{process_intro}</p>
        </div>
      </div>
      <div class="steps rise">
        {steps}
      </div>
    </div>
  </section>

  <section class="sec" id="work">
    <div class="wrap">
      <div class="sec-head rise">
        <span class="sec-n">03</span>
        <div>
          <h2>Our work.</h2>
          <p>{work_intro}</p>
        </div>
      </div>
      <div class="gal rise">
        {gallery}
      </div>
    </div>
  </section>

  <section class="sec" id="why">
    <div class="wrap">
      <div class="sec-head rise">
        <span class="sec-n">04</span>
        <div>
          <h2>{why_h}</h2>
          <p>{why_intro}</p>
        </div>
      </div>
      <div class="why rise">
        {why}
      </div>
    </div>
  </section>

  <section class="sec" id="faq">
    <div class="wrap">
      <div class="sec-head rise">
        <span class="sec-n">05</span>
        <div>
          <h2>Asked before we start.</h2>
          <p>{faq_intro}</p>
        </div>
      </div>
      <div class="faq rise">
        {faq}
      </div>
    </div>
  </section>

  <section class="sec contact" id="contact">
    <div class="wrap contact-grid">
      <div>
        <p class="eyebrow" style="color:{tansoft}">Start a conversation</p>
        <h2 style="margin-top:14px">{contact_h}</h2>
        <p>{contact_p}</p>
        <div class="contact-cta">
          <a class="btn btn-solid" href="tel:{phonetel}">Call {phone}</a>
          {social_btn}
        </div>
      </div>
      <dl>
        <div><dt>Phone</dt><dd><a href="tel:{phonetel}">{phone}</a></dd></div>
        {email_dd}
        <div><dt>Based in</dt><dd>{based}</dd></div>
        <div><dt>Service area</dt><dd>{area}</dd></div>
        {social_dd}
      </dl>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div class="flock">
      {foot_inner}
    </div>
    <p>{name} &mdash; {trade_short}. {based}. &copy; <span id="yr">2026</span></p>
  </div>
</footer>

<script>
(function(){{
  document.documentElement.classList.add('js');
  var els = document.querySelectorAll('.rise');
  if ('IntersectionObserver' in window) {{
    var io = new IntersectionObserver(function(entries){{
      entries.forEach(function(e){{ if (e.isIntersecting) {{ e.target.classList.add('on'); io.unobserve(e.target); }} }});
    }}, {{ rootMargin: '0px 0px -10% 0px', threshold: 0.05 }});
    els.forEach(function(el){{ io.observe(el); }});
  }} else {{
    els.forEach(function(el){{ el.classList.add('on'); }});
  }}
  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
}})();
</script>
</body>
</html>
"""

def build(cfg, base_dir):
    fontq = cfg["fontq"]  # e.g. "Archivo:wght@500;700;800&family=Inter:wght@400;500;600"
    d = dict(cfg)
    d.setdefault("markfile","logo-mark.png"); d.setdefault("wordfile","logo-word.png")
    d.setdefault("marklight","logo-mark-light.png"); d.setdefault("wordlight","logo-word-light.png")
    d.setdefault("extra_css","")
    d["fontq"] = fontq
    lockup = cfg.get("lockup")
    if lockup:
        d["brand_inner"] = '<img class="lockup" src="assets/%s" alt="%s" width="%d" height="%d">' % (cfg["lockup"], cfg["name"], cfg["lockupw"], cfg["lockuph"])
        d["foot_inner"] = '<img class="lockup" src="assets/%s" alt="%s" width="%d" height="%d">' % (cfg["lockuplight"], cfg["name"], cfg["lockupw"], cfg["lockuph"])
    else:
        d["brand_inner"] = ('<img class="mark" src="assets/%s" alt="" width="%d" height="%d">' % (d["markfile"], cfg["markw"], cfg["markh"])
                            + '<img class="word" src="assets/%s" alt="%s" width="%d" height="%d">' % (d["wordfile"], cfg["name"], cfg["wordw"], cfg["wordh"]))
        d["foot_inner"] = ('<img class="mark" src="assets/%s" alt="" width="%d" height="%d">' % (d["marklight"], cfg["markw"], cfg["markh"])
                           + '<img class="word" src="assets/%s" alt="%s" width="%d" height="%d">' % (d["wordlight"], cfg["name"], cfg["wordw"], cfg["wordh"]))
    d["chips"] = "\n          ".join(
        '<li>%s</li>' % html.escape(c) for c in cfg["chips"])
    d["svc_cards"] = "\n        ".join(
        '<article><span class="code">%02d</span><h3>%s</h3><p>%s</p></article>' % (i+1, t, desc)
        for i, (t, desc) in enumerate(cfg["services"]))
    d["steps"] = "\n        ".join(
        '<div class="step"><span class="n">%02d</span><h3>%s</h3><p>%s</p></div>' % (i+1, t, desc)
        for i, (t, desc) in enumerate(cfg["steps"]))
    d["gallery"] = "\n        ".join(
        '<figure><img src="assets/%s" alt="%s" loading="lazy" width="%d" height="%d"><figcaption>%s</figcaption></figure>'
        % (f, alt, w, h, cap) for (f, alt, cap, w, h) in cfg["gallery"])
    d["why"] = "\n        ".join(
        '<div><h3>%s</h3><p>%s</p></div>' % (t, desc) for (t, desc) in cfg["why"])
    d["faq"] = "\n        ".join(
        '<details%s><summary>%s</summary><p>%s</p></details>' % (' open' if i == 0 else '', q, a)
        for i, (q, a) in enumerate(cfg["faq"]))
    # email / social
    if cfg.get("email"):
        d["email_dd"] = '<div><dt>Email</dt><dd><a href="mailto:%s">%s</a></dd></div>' % (cfg["email"], cfg["email"])
    else:
        d["email_dd"] = ""
    if cfg.get("social_url"):
        d["social_btn"] = '<a class="btn btn-ghost" href="%s" target="_blank" rel="noopener">%s</a>' % (cfg["social_url"], cfg.get("social_btn_label", "Message us"))
        d["social_dd"] = '<div><dt>%s</dt><dd><a href="%s" target="_blank" rel="noopener">%s</a></dd></div>' % (cfg.get("social_label", "Social"), cfg["social_url"], cfg.get("social_handle", cfg["social_url"]))
    else:
        d["social_btn"] = ""
        d["social_dd"] = ""
    out = TPL.format(**d)
    os.makedirs(base_dir, exist_ok=True)
    with open(os.path.join(base_dir, "index.html"), "w") as f:
        f.write(out)
    return len(out)

if __name__ == "__main__":
    print("module")
