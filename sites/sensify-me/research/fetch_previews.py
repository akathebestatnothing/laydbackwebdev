#!/usr/bin/env python3
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
records = json.loads((ROOT/'research/asset-retrieval.json').read_text())
manifest=[]
def fetch(record):
    u = record['retrieved_url']
    try:
        req=Request(u,headers={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36'})
        with urlopen(req,timeout=30) as response:
            data=response.read()
        raw=ROOT/'research'/'originals'/f"preview-{record['index']:02d}.jpg"
        raw.write_bytes(data)
        with Image.open(raw) as im:
            im=im.convert('RGB')
            im.save(raw,quality=94,optimize=True)
            thumb=im.copy(); thumb.thumbnail((480,480))
            (ROOT/'research'/'originals'/f"thumb-{record['index']:02d}.jpg").write_bytes(b'')
            thumb.save(ROOT/'research'/'originals'/f"thumb-{record['index']:02d}.jpg",quality=85)
            return {'index':record['index'],'file':str(raw.relative_to(ROOT)),'width':im.width,'height':im.height,'status':'downloaded','source_url':record['retrieved_url']}
    except Exception as exc:
        return {'index':record['index'],'status':'failed','source_url':u,'error':str(exc)}

manifest=list(ThreadPoolExecutor(max_workers=6).map(fetch,records))
(ROOT/'research/preview-retrieval.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
# Contact sheet for visual review only.
tiles=[]
for item in manifest:
    if item['status']=='downloaded':
        im=Image.open(ROOT/item['file']).convert('RGB'); im.thumbnail((230,260)); tiles.append((item['index'],im.copy()))
w=1000; cell_w=250; cell_h=320
sheet=Image.new('RGB',(w,((len(tiles)+3)//4)*cell_h),'#fffaf4'); d=ImageDraw.Draw(sheet)
for n,(idx,im) in enumerate(tiles):
    x=(n%4)*cell_w+10; y=(n//4)*cell_h+36
    d.text((x,y-24),f'PHOTO {idx:02d}',fill='#183d38')
    sheet.paste(im,(x+(230-im.width)//2,y))
sheet.save(ROOT/'research/contact-sheet.jpg',quality=91)
print('contact_sheet',ROOT/'research/contact-sheet.jpg')
