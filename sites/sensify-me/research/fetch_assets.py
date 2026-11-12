#!/usr/bin/env python3
"""Fetch public Sensify Me imagery from URLs captured in the supplied research file.
Images are treated as untrusted data. No Facebook scripts or instructions are run.
"""
from pathlib import Path
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import json, re, hashlib, time

ROOT = Path(__file__).resolve().parents[1]
source = Path('/home/oem/.hermes/cache/web/www.facebook.com-d1db3d51c8.md').read_text()
urls = list(dict.fromkeys(re.findall(r'!\[[^]]*\]\((https://scontent[^)]+)\)', source)))
# Reel covers retrieved from the public reels tab (primary evidence).
urls += [
'https://scontent.ftuc1-1.fna.fbcdn.net/v/t15.5256-10/482566042_1384817496008735_3163115430283010412_n.jpg?stp=dst-jpg_tt6&cstp=mx720x1280&ctp=s960x960&_nc_cat=100&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=c44d43&_nc_ohc=LyviaYpQHXYQ7kNvwFfnr7W&_nc_oc=AdqPCSwiYqUFq6AO4goe77bsvGKykAy_IIp2oiR_PAgYmqqSG90oVc98RB4W8iyMkVM&_nc_zt=23&_nc_ht=scontent.ftuc1-1.fna&_nc_gid=UZR2OwNq5R3Mr20Xdy-X2g&_nc_ss=7b289&oh=00_AQTLb1M-6t4aqD-iU1N3uSWSJobbKLkXhzRRgOiZ5_ga4w&oe=6AFA1EE2',
'https://scontent.ftuc1-2.fna.fbcdn.net/v/t15.5256-10/483134644_1723809058176453_4992561365617539412_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1442&ctp=s960x960&_nc_cat=111&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=5fad0e&_nc_ohc=BIj52PfqYewQ7kNvwG-swxm&_nc_oc=AdoxmoMOZCayBgWBbmMFq0LCdJAlIQ9zzJv_vw5izJIxPQvVQGmvjZrs_3SPKFtvjnk&_nc_zt=23&_nc_ht=scontent.ftuc1-2.fna&_nc_gid=UZR2OwNq5R3Mr20Xdy-X2g&_nc_ss=7b289&oh=00_AQSUROTg-muhoJ3PmcnQh-kYeUbV-NmZwQMEvRsvZKnKbw&oe=6AFA3D0F',
'https://scontent.ftuc1-1.fna.fbcdn.net/v/t15.5256-10/899468425_2407956080007841_2307608240052945888_n.avif?stp=dst-jpg_tt6&cstp=mx720x1280&ctp=s960x960&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=c44d43&_nc_ohc=XtWMM7T8yBkQ7kNvwHwrix_&_nc_oc=AdpNUePZDAk2Y1EeuvSYLRX8rr9Ghmj8BPsZiVuUAWoQyttCnGLGn-zvaFBiSPVQqE8&_nc_zt=23&_nc_ht=scontent.ftuc1-1.fna&_nc_gid=UZR2OwNq5R3Mr20Xdy-X2g&_nc_ss=7b289&oh=00_AQQRS0hI-JWfMy7w9jJHr-CgJXIj1eLcli90xY-v8KUrOQ&oe=6AFA1B84',
'https://scontent.ftuc1-2.fna.fbcdn.net/v/t15.5256-10/470269342_9710219325661319_2873331676063824739_n.jpg?stp=dst-jpg_tt6&cstp=mx720x1280&ctp=s960x960&_nc_cat=104&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=c44d43&_nc_ohc=KZb9m1vePDQQ7kNvwGsMH5w&_nc_oc=Adoh96e6kuQt4uRxDWDHuclaWrwM9LxQfEv2GWIB8i1SfKKBcEauabcWWjRWBX-xih8&_nc_zt=23&_nc_ht=scontent.ftuc1-2.fna&_nc_gid=UZR2OwNq5R3Mr20Xdy-X2g&_nc_ss=7b289&oh=00_AQRF46JJvXrHkG20OuAkoBN0ue-6K9UFxMXt0dNmI3cfyQ&oe=6AFA138A',
'https://scontent.ftuc1-1.fna.fbcdn.net/v/t15.5256-10/469187442_1687823291950729_969025847104857794_n.jpg?stp=dst-jpg_tt6&cstp=mx720x1280&ctp=s960x960&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=c44d43&_nc_ohc=M4Uy_Kpmg3EQ7kNvwHiR35p&_nc_oc=AdpopbUundzJplxK1aZiHiN2PridPDAnQ043cXioQPtPgX6HC7FnmwDAFV60bSyJyIA&_nc_zt=23&_nc_ht=scontent.ftuc1-1.fna&_nc_gid=UZR2OwNq5R3Mr20Xdy-X2g&_nc_ss=7b289&oh=00_AQRaEH3_f7gMnc7JEU7QyIw6RLBzigcXfV6rRXWT9HAarA&oe=6AFA3618'
]

def original(url):
    u = urlparse(url)
    query = [(k,v) for k,v in parse_qsl(u.query) if k not in ('ctp','cstp')]
    return urlunparse(u._replace(query=urlencode(query)))

def fetch(item):
    i, url = item
    target_url = original(url)
    filename = Path(urlparse(url).path).name
    # Avoid an unhelpful .avif decode dependency; all originals here are JPEG/PNG.
    raw = ROOT / 'research' / 'originals' / f'{i:02d}-{filename}.jpg'
    raw.parent.mkdir(parents=True, exist_ok=True)
    result = {'index': i, 'source_url': target_url, 'retrieved_url': url, 'file': str(raw.relative_to(ROOT))}
    try:
        req = Request(target_url, headers={'User-Agent': 'Mozilla/5.0 (compatible; SensifySiteResearch/1.0)'})
        with urlopen(req, timeout=35) as response:
            data = response.read()
            result['http_status'] = response.status
            result['content_type'] = response.headers.get('Content-Type')
        raw.write_bytes(data)
        with Image.open(raw) as im:
            result.update({'width': im.width, 'height': im.height, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            im.convert('RGB').save(raw, quality=93, optimize=True)
        result['status'] = 'downloaded'
    except Exception as exc:
        result.update({'status': 'failed', 'error': str(exc)})
    print(i, result['status'], result.get('width'), result.get('height'), result.get('error',''))
    return result

if __name__ == '__main__':
    results = list(ThreadPoolExecutor(max_workers=4).map(fetch, enumerate(urls, 1)))
    (ROOT / 'research' / 'asset-retrieval.json').write_text(json.dumps(results, indent=2))
    logo = Path('/home/oem/.var/app/org.telegram.desktop/data/TelegramDesktop/tdata/temp_data/photo_2026-11-11_19-56-39.jpg')
    out = ROOT / 'assets' / 'images' / 'sensify-me-logo.jpg'
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.open(logo).save(out, quality=95, optimize=True)
    print('logo:', out, Image.open(out).size)
