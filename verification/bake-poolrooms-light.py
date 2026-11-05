"""Build the small indoor irradiance atlas from actual scene geometry, offline.
Run the Node graphics export, then: blender -b -P verification/bake-poolrooms-light.py
No Blender dependencies, raycasts or light bake are needed by the shipped app.
"""
import os, math, json, struct
from pathlib import Path
from array import array
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import bpy
src=Path('poolrooms-graphics-check')
meta=json.loads((src/'frames.json').read_text())['geometry']
verts=[]; faces=[]
for geom in meta[:2]:
    pos=array('f');pos.frombytes((src/geom['attributes']['position']['file']).read_bytes());idx=array('I');idx.frombytes((src/geom['indices']).read_bytes());base=len(verts)
    verts.extend(zip(pos[::3],pos[1::3],pos[2::3]))
    faces.extend((base+idx[i],base+idx[i+1],base+idx[i+2]) for i in range(0,len(idx),3))
tree=BVHTree.FromPolygons(verts,faces,all_triangles=True,epsilon=.0001)
# Surface-adjacent rectangular coves, diffuse lamps and their bounced pools of light.
sources=[
 ((-.8,5.65,-5.38),(1.85,1.52,1.06),3.4,(.0,.04,1.25)),
 ((2.5,6.50,2.1),(.70,.86,.74),5.,(1.3,.0,.0)),
 ((-1.33,2.55,3.3),(1.21,1.27,1.00),3.85,(.0,0.,1.04)),
 ((-7.70,2.90,-11.65),(1.80,1.26,.72),3.4,(.10,.0,.7)),
 ((-7.20,1.39,-8.68),(.40,.56,.46),1.5,(.55,0.,.13)),
 ((-9.70,3.27,-13.9),(1.10,1.03,.75),2.6,(.05,.0,1.23)),
 ((-7.1,2.9,-20.15),(1.50,1.40,.97),2.85,(.65,0.,.03)),
 ((-3.82,3.85,-14.35),(.46,.63,.48),2.2,(.36,0.,0.)),
 ((6.78,3.29,-5.30),(.68,1.42,1.28),3.75,(.36,0.,.36)),
 ((8.72,3.24,-10.03),(.56,.98,.85),3.5,(.04,.0,.58)),
 ((8.56,3.14,-17.65),(.81,.95,.81),3.35,(.63,0.,.00)),
 ((-5.72,4.70,4.5),(.62,.66,.53),3.8,(0.,0.,.93)),
 ((.72,2.65,-.30),(.30,.42,.31),3.1,(.54,.0,.0)),
 ((3.83,3.77,7.9),(.60,.69,.51),2.8,(.82,0.,.0))
]
samples=[]
for p,col,r,span in sources:
    for a in [-1.,0.,1.]:
        samples.append((Vector([v+a*d for v,d in zip(p,span)]),[x/3 for x in col],r*r))
# Values are samples at voxel centres. Y layers are packed horizontally, then vertically.
nx,ny,nz,cols=55,23,81,6;rows=(ny+cols-1)//cols;step=.40
origin=(-10.35,-1.56,-24.15);width=nx*cols;height=nz*rows
image=bytearray(width*height*3)
for j in range(ny):
 for k in range(nz):
    for i in range(nx):
        p=Vector((origin[0]+i*step,origin[1]+j*step,origin[2]+k*step))
        light=[.18,.213,.194]
        for target,c,rsq in samples:
            d=target-p;d2=d.length_squared;f=rsq/(d2+rsq)
            if f<.022:continue
            dist=math.sqrt(d2)
            if dist>.015 and tree.ray_cast(p,d/dist,max(.001,dist-.016))[0] is not None:continue
            for axis in range(3):light[axis]+=c[axis]*f
        # Tone-compress irradiance, retaining a soft toe in the unlit bays.
        off=(((j//cols)*nz+k)*width+(j%cols)*nx+i)*3
        for a in range(3):image[off+a]=min(255,round(255*(1-math.exp(-light[a]*1.24))))
# PNG encoder for linear-data atlas. PNG row zero corresponds to texture v=0 (flipY=false).
import zlib,binascii
def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',binascii.crc32(tag+data)&0xffffffff)
raw=b''.join(b'\0'+image[y*width*3:(y+1)*width*3] for y in range(height))
blob=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
out=Path('assets/poolrooms/indoor-light.png');out.write_bytes(blob);print('Saved',width,height,len(blob),'bytes')
