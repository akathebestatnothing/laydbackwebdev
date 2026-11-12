#!/usr/bin/env python3
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from io import BytesIO
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'research/facebook-rendered.html').read_text().replace('\\/','/')
records=json.loads((ROOT/'research/preview-retrieval.json').read_text())
viewer_ids={12:'899772949_122184515132662454_5300240595244847405_n.jpg',13:'898720535_122184515552662454_1988102305080549827_n.jpg',14:'896980457_122184515570662454_2787982467479521131_n.jpg',15:'898082286_122184515336662454_6218623773511912079_n.jpg',16:'894744773_122184516008662454_4155114922674285207_n.jpg'}
def fetch(rec):
    i=rec['index']
    if i not in viewer_ids:
        # Fresh run: overwrite generic CDN fallback with actual public reel cover.
        im = Image.open(ROOT/rec['file']).convert('RGB')
        im.save(ROOT/'assets/images'/f'facebook-{i:02d}.webp','WEBP',quality=88,method=6)
        return {'index':i,'status':'downloaded','derivative':'public-preview','file':f'assets/images/facebook-{i:02d}.webp','width':rec['width'],'height':rec['height'],'source_url':rec.get('source_url')}
    marker=viewer_ids[i]
    # Find the URI carrying this exact asset token, not a nearby album member.
    import re
    cursor=0
    start=-1
    while True:
        pos=s.find(marker,cursor)
        if pos < 0: break
        vpos=s.find('"viewer_image"',max(0,pos-150))
        if 0 <= vpos <= pos:
            start=vpos
            break
        cursor=pos+len(marker)
    if start < 0: return {'index':i,'status':'viewer-image-not-found'}
    u0=s.find('"uri":"',start)
    if u0<0: return {'index':i,'status':'viewer-image-not-found'}
    url=s[u0+7:s.find('"',u0+7)].encode().decode('unicode_escape')
    try:
        with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35) as r: data=r.read()
        im=Image.open(BytesIO(data)).convert('RGB')
        preview = Image.open(ROOT/rec['file']).convert('RGB')
        preview.save(ROOT/'assets/images'/f'facebook-{i:02d}.webp','WEBP',quality=88,method=6)
        return {'index':i,'status':'downloaded','derivative':'viewer-image','width':im.width,'height':im.height,'source_url':url,'sha256':hashlib.sha256(data).hexdigest(),'file':f'assets/images/facebook-{i:02d}.webp'}
    except Exception as exc: return {'index':i,'status':'failed','source_url':url,'error':str(exc)}
results=list(ThreadPoolExecutor(max_workers=4).map(fetch,[r for r in records if r['status']=='downloaded']))
(ROOT/'research/final-assets.json').write_text(json.dumps(results,indent=2))
logo=Image.open('/home/oem/.var/app/org.telegram.desktop/data/TelegramDesktop/tdata/temp_data/photo_2026-11-11_19-56-39.jpg').convert('RGB')
logo.save(ROOT/'assets/images/sensify-me-logo.webp','WEBP',quality=91,method=6)
print(json.dumps(results,indent=2))
