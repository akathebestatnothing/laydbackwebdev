#!/usr/bin/env python3
"""Fleet anti-slop scanner — the measured tells from the 2026 research
(Krebs/Show HN 1,590 pages; antiwebslop 509 sites; Impeccable), checked
statically against every preview. Prints a per-tell fleet count and the
worst sites. Not a score — a worklist."""
import glob, json, os, re, collections

SITES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'sites')
PROT = {l.strip() for l in open('/home/ogheesus/personal-autogtm/state/protected_sites.txt')
        if l.strip() and not l.startswith('#')}

FONT_BAD = re.compile(r'\b(Inter|Geist|Space Grotesk|Instrument Serif|Playfair Display)\b', re.I)
BANNED_COPY = re.compile(r'\b(unlock|supercharge|seamless|seamlessly|elevate your|effortless|cutting-edge|game-chang|all-in-one|revolutioni[sz]e|leverage|synerg)\w*', re.I)
CORRECTION = re.compile(r"\bnot just\b.{0,40}\bit'?s\b|\bit'?s not\b.{0,40}\bit'?s\b", re.I)

def scan(slug, d):
    html = open(os.path.join(d, 'index.html'), encoding='utf-8', errors='ignore').read()
    css = ''
    for fn in glob.glob(os.path.join(d, '*.css')):
        css += open(fn, encoding='utf-8', errors='ignore').read()
    head = html[:400000]
    body = re.sub(r'<style[\s\S]*?</style>', '', re.sub(r'<script[\s\S]*?</script>', '', html))
    text = re.sub(r'<[^>]+>', ' ', body)
    hits = {}

    # type
    m = FONT_BAD.findall(head + css)
    if m:
        hits['default-font:' + collections.Counter(x.lower() for x in m).most_common(1)[0][0]] = 1

    # gradients (any)
    g = len(re.findall(r'linear-gradient|radial-gradient|conic-gradient', css + head))
    if g:
        hits['gradients'] = g
    gt = len(re.findall(r'background-clip:\s*text|-webkit-text-fill-color:\s*transparent', css))
    if gt:
        hits['gradient-text'] = gt

    # glass
    gl = len(re.findall(r'backdrop-filter', css))
    if gl:
        hits['glass'] = gl

    # shadows at rest
    sh = len(re.findall(r'box-shadow', css))
    if sh > 3:
        hits['box-shadow'] = sh

    # eyebrows: uppercase + letter-spacing + small
    eb = 0
    for rule in re.findall(r'([^{}]{1,120})\{([^}]*)\}', css):
        sel, decl = rule
        if re.search(r'text-transform:\s*uppercase', decl) and re.search(r'letter-spacing:\s*[0-9.]', decl):
            fs = re.search(r'font-size:\s*([\d.]+)(px|rem)', decl)
            if fs and ((fs.group(2) == 'px' and float(fs.group(1)) <= 14) or (fs.group(2) == 'rem' and float(fs.group(1)) <= 0.9)):
                eb += 1
    if eb:
        hits['eyebrow-rules'] = eb

    # emoji
    em = re.findall(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]', text)
    if em:
        hits['emoji'] = len(em)

    # middle dots / em dashes in copy
    md = text.count('·')
    if md:
        hits['middot'] = md
    ed = text.count('—')
    if ed:
        hits['emdash'] = ed

    # copy slop
    bc = BANNED_COPY.findall(text)
    if bc:
        hits['banned-copy:' + ','.join(sorted(set(x.lower() for x in bc))[:3])] = len(bc)
    if CORRECTION.search(text):
        hits['not-x-but-y'] = 1

    # fake proof
    if re.search(r'trusted by [\d,]+\+|10,?000\+|99\.9% uptime|loved by [\d,]+', text, re.I):
        hits['invented-stat'] = 1
    if re.search(r'lorem ipsum', text, re.I):
        hits['lorem'] = 1

    # icon cards: 3+ sibling elements each holding an svg/img icon
    icons = len(re.findall(r'<(svg|img)[^>]*(icon|logo-mark)', head, re.I))
    if icons >= 3:
        hits['icon-assets'] = icons

    # pills / badges above h1
    if re.search(r'class="[^"]*(badge|pill|chip)[^"]*"[^>]*>[^<]{2,30}</[a-z]+>\s*<h1', head, re.I):
        hits['herro-badge'] = 1

    # centered hero
    if re.search(r'text-align:\s*center', css) and re.search(r'\.hero[^{}]*\{[^}]*text-align:\s*center', css):
        hits['centered-hero'] = 1

    # stat strip
    if re.search(r'class="[^"]*(stats|stat-bar|numbers)[^"]*"', head, re.I):
        hits['stat-strip'] = 1

    # card kit: same radius on many things
    rad = collections.Counter(re.findall(r'border-radius:\s*([\d.]+(?:px|rem))', css))
    if rad:
        v, n = rad.most_common(1)[0]
        if n >= 6:
            hits['one-radius-everywhere:' + v] = n

    # mono
    if re.search(r'font-family:[^;}]*mono', css, re.I):
        hits['monospace'] = 1

    return hits

rows = []
for d in sorted(glob.glob(os.path.join(SITES, '*/'))):
    slug = os.path.basename(d.rstrip('/'))
    if slug in PROT or not os.path.exists(os.path.join(d, 'index.html')):
        continue
    try:
        rows.append({'slug': slug, **scan(slug, d)})
    except Exception as e:
        rows.append({'slug': slug, 'error': str(e)[:50]})

json.dump(rows, open('/tmp/aslop.json', 'w'), indent=1)

tally = collections.Counter()
sites_by = collections.Counter()
for r in rows:
    for k, v in r.items():
        if k == 'slug':
            continue
        base = k.split(':')[0]
        tally[base] += 1
        sites_by[base] += 1

print(f"sites scanned: {len(rows)}")
print("\ntell                          sites   %")
for t, n in tally.most_common(30):
    print(f"  {t:28} {n:5}  {100*n/len(rows):5.1f}%")

print("\nmost slop-loaded sites:")
for r in sorted(rows, key=lambda x: -len([k for k in x if k != 'slug']))[:12]:
    ks = [k for k in r if k != 'slug']
    print(f"  {r['slug'][:36]:36} {len(ks):2}  {ks[:5]}")