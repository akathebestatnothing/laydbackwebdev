import os
import shutil
from PIL import Image

files = ['hero-concrete.jpg']
files += ['work_0%s.jpg' % i for i in '1234567']
files += ['gal_%s.jpg' % i for i in '123']

for f in files:
    if not os.path.exists(f):
        continue
    shutil.copy2(f, '_web-orig/' + f)
    im = Image.open(f).convert('RGB')
    w, h = im.size
    if max(w, h) > 1400:
        s = 1400.0 / max(w, h)
        imafgesize = (round(w * s), round(h * s))
        im = im.resize(imafgesize, Image.LANCZOS)
    im.save(f, 'JPEG', quality=82, optimize=True, progressive=True)
    print(f, os.path.getsize(f) // 1024, 'KB', im.size)
