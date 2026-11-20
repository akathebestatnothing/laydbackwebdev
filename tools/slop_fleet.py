#!/usr/bin/env python3
"""Fleet slop scan: run the impeccable detector over every preview and tally
the categories per site. Writes /tmp/slop_scores.json + a summary."""
import glob, json, os, re, subprocess, collections

SITES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'sites')
BIN = os.path.expanduser('~/.hermes/skills/impeccable/scripts/impeccable')
TAG = re.compile(r'\[([a-z][a-z-]+)\]')

rows = []
for d in sorted(glob.glob(os.path.join(SITES, '*/'))):
    slug = os.path.basename(d.rstrip('/'))
    idx = os.path.join(d, 'index.html')
    if not os.path.exists(idx):
        continue
    try:
        r = subprocess.run([BIN, "detect", idx], capture_output=True, text=True, timeout=90); out = (r.stderr or "") + (r.stdout or "")
    except Exception:
        out = ''
    tags = TAG.findall(out)
    rows.append({'slug': slug, 'n': len(tags), 'tags': dict(collections.Counter(tags))})

json.dump(rows, open('/tmp/slop_scores.json', 'w'), indent=1)
cat = collections.Counter()
sites_by = collections.Counter()
for r in rows:
    for t, n in r['tags'].items():
        cat[t] += n
        if t not in ('low-contrast', 'cramped-padding', 'tight-leading'):
            sites_by[t] += 1
clean = [r for r in rows if r['n'] == 0]
print(f"sites scanned: {len(rows)}  clean: {len(clean)}  with hits: {len(rows)-len(clean)}")
print("\ntop categories (occurrences):")
for t, n in cat.most_common(18):
    print(f"  {t:26} {n:5}   sites={sites_by.get(t,0)}")
print("\nworst sites:")
for r in sorted(rows, key=lambda x: -x['n'])[:15]:
    print(f"  {r['slug'][:38]:38} {r['n']:4}  {list(r['tags'])[:5]}")
