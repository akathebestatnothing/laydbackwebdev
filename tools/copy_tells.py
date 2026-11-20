#!/usr/bin/env python3
"""Copy-tell fixer — the two highest-weighted copy tells in the 2026 studies:
the em dash and the middle-dot separator. Text-node aware; leaves attributes,
CSS and JS alone except for meta/alt/aria copy.

  python3 tools/copy_tells.py --check sites/*/index.html   # exit 1 if any file is over the limit
  python3 tools/copy_tells.py --apply sites/*/index.html   # rewrite in place
"""
import re, sys

LIMIT = 3
TITLE = re.compile(r'(<title[^>]*>)([\s\S]*?)(</title>)', re.I)
TAG = re.compile(r'(<[^>]+>)')


def fix_title(m):
    return m.group(1) + m.group(2).replace(' — ', ' | ').replace('—', ' | ') + m.group(3)


def fix_attrs(s):
    def one(m):
        name, q, val = m.group(1), m.group(2), m.group(3)
        brk = ', ' if name.lower() == 'alt' else '. '
        v = re.sub(r'\s+—\s+(?=[A-Z])', brk, val)
        v = re.sub(r'\s+—\s+', ', ', v)
        v = re.sub(r'\s+·\s+', ', ', v)
        return f'{name}={q}{v}{q}'
    return re.sub(r'\b(content|alt|aria-label|title|placeholder)=(["\'])([\s\S]*?)\2', one, s, flags=re.I)


def fix_prose(c):
    if '—' not in c and '·' not in c and '&middot;' not in c:
        return c
    c = re.sub(r'\s+—\s+(?=[A-Z])', '. ', c)
    c = re.sub(r'\s+—\s+', ', ', c)
    c = re.sub(r'\s+·\s+', ', ', c)
    c = re.sub(r'\s*&middot;\s*', ', ', c)
    c = c.replace(' ·', ',').replace('— ', ', ')
    # dash-only node (<i>—</i> between marquee segments) and tight word—word
    if re.fullmatch(r'\s*—\s*', c):
        return ', '
    if re.fullmatch(r'(?:\s|&nbsp;)*·(?:\s|&nbsp;)*', c):
        return ', '
    c = re.sub(r'(?<=[A-Za-z])—(?=[A-Za-z])', ', ', c)
    return c


def strip_css_dots(src):
    return re.sub(r'content:\s*([\"\'])\s*·\s*\1', 'content:""', src)


def fix(src):
    parts = TAG.split(src)
    parts = [fix_attrs(p) if p.startswith('<') else fix_prose(p) for p in parts]
    return strip_css_dots(TITLE.sub(fix_title, ''.join(parts)))


def main(argv):
    apply = '--apply' in argv
    files = [a for a in argv if not a.startswith('--')]
    bad = 0
    for f in files:
        src = open(f, encoding='utf-8', errors='ignore').read()
        n = src.count('—')
        if n <= LIMIT:
            continue
        fixed = fix(src)
        assert fixed.count('="') == src.count('="'), f'attribute damage in {f}'
        assert fixed.count('<') == src.count('<'), f'tag damage in {f}'
        bad += 1
        if apply:
            open(f, 'w', encoding='utf-8').write(fixed)
            print(f'fixed {f}: {n} -> {fixed.count("—")}')
        else:
            print(f'{n:4} em dashes  {f}')
    if not apply and bad:
        print(f'\n{bad} file(s) over the limit of {LIMIT}. Fix: python3 tools/copy_tells.py --apply <files>')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))