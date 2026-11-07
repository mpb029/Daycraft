"""Pack and verify the 144 distinct water renders. Run from the repo root."""
from pathlib import Path
from PIL import Image
import numpy as np
import os,hashlib
root=Path(os.environ.get('DAYCRAFT_WATER_BAKE',str(Path.cwd()/'mall-water-bake')))
images=[Image.open(root/'frames'/f'{i:04d}.png').convert('RGBA') for i in range(144)]
assert all(im.size==(128,192) for im in images)
assert len({hashlib.sha256(im.tobytes()).hexdigest() for im in images})==144
premult=[]
for im in images:
 a=np.asarray(im,dtype=np.float32)/255
 premult.append(a[:,:,:3]*a[:,:,3:])
d=np.array([np.abs(premult[(i+1)%144]-a).mean() for i,a in enumerate(premult)])
assert d[-1]<np.quantile(d,.95)*1.1,'Visible discontinuity at loop seam'
atlas=Image.new('RGBA',(1536,2304))
for i,im in enumerate(images):atlas.paste(im,((i%12)*128,(i//12)*192))
path=Path('assets/mall/liquid-flow.webp');atlas.save(path,quality=91,method=6,alpha_quality=100)
print('Packed 144 distinct water frames:',path.stat().st_size,'bytes')
print('Loop seam / typical adjacent difference:',float(d[-1]),float(np.median(d)))
