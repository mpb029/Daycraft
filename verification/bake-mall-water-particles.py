"""Bake a periodic gravitational particle fountain into connected water meshes.
This is ballistic water, not a Navier-Stokes fluid solver.
"""
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
import sys,os,argparse
ROOT=Path(os.environ.get('DAYCRAFT_WATER_BAKE',str(Path.cwd()/'mall-water-bake')))
OUT=ROOT/'meshes';OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(67192)
N=80000;duration=6.0
birth=rng.uniform(0,duration,N)
a=rng.uniform(0,np.pi*2,N);r=.026*np.sqrt(rng.uniform(0,1,N))
origin=np.column_stack((np.cos(a)*r,np.sin(a)*r,np.full(N,.018)))
phase=birth*np.pi*2/duration
# Coherent emission tracks preserve water filaments; only the fine spray has
# independent velocities. Pressure varies at release, rather than deforming a
# frozen surface after it has left the nozzle.
tracks=96
track=rng.integers(0,tracks,N)
angle=rng.uniform(0,2*np.pi,tracks);speed=rng.normal(0,.14,tracks)
track_phase=rng.uniform(0,2*np.pi,tracks)
velocity=np.column_stack((
 .16*np.cos(angle[track])+.10*np.sin(phase*7+track_phase[track]),
 .16*np.sin(angle[track])+.10*np.sin(phase*9+track_phase[track]),
 3.62+speed[track]+.22*np.sin(phase*3)+.10*np.sin(phase*11+track_phase[track])))
velocity+=rng.normal(0,.018,(N,3))
# Extra short splash trajectories around the return area.
splash=rng.uniform(0,1,N)<.10
origin[splash,0]=np.cos(a[splash])*rng.uniform(.03,.20,splash.sum())
origin[splash,1]=np.sin(a[splash])*rng.uniform(.03,.20,splash.sum())
velocity[splash,:2]*=2.0
velocity[splash,2]=rng.uniform(.25,1.25,splash.sum())
lo=np.array([-.42,-.34,-.015]);step=.008
shape=np.array([106,86,136]);corner=np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]])
tets=np.array([[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]])
def surface(grid,level=.10):
 vals=np.stack([grid[c[0]:shape[0]-1+c[0],c[1]:shape[1]-1+c[1],c[2]:shape[2]-1+c[2]] for c in corner],axis=-1)
 use=(vals.max(-1)>level)&(vals.min(-1)<level)
 ids=np.argwhere(use);v=vals[use][:,tets].reshape(-1,4)
 pos=(ids[:,None,None,:]+corner[tets][None,:,:,:]).reshape(-1,4,3)
 inside=v>level;mask=(inside*np.array([1,2,4,8])).sum(-1)
 triangles=[]
 for m in range(1,15):
  sel=mask==m
  if not sel.any():continue
  vv=v[sel];pp=pos[sel];ii=[i for i in range(4) if m&(1<<i)];oo=[i for i in range(4) if not m&(1<<i)]
  def cross(i,j):
   t=(level-vv[:,i])/(vv[:,j]-vv[:,i]);return pp[:,i]+t[:,None]*(pp[:,j]-pp[:,i])
  if len(ii)==1:
   tris=np.stack([cross(ii[0],j) for j in oo],axis=1);triangles.append(tris)
  elif len(ii)==3:
   tris=np.stack([cross(oo[0],j) for j in ii[::-1]],axis=1);triangles.append(tris)
  else:
   aa,bb,cc,dd=cross(ii[0],oo[0]),cross(ii[0],oo[1]),cross(ii[1],oo[0]),cross(ii[1],oo[1])
   triangles.extend([np.stack([aa,bb,cc],axis=1),np.stack([bb,dd,cc],axis=1)])
 tri=np.concatenate(triangles).reshape(-1,3)*step+lo
 points,index=np.unique(np.round(tri,6),axis=0,return_inverse=True)
 return points.astype('float32'),index.astype('int32').reshape(-1,3)
def bake(frame):
 t=frame/24;age=(t-birth)%duration
 p=origin+velocity*age[:,None];p[:,2]-=4.905*age**2
 active=(age<1.0)&(p[:,2]>.002)&np.all((p>lo)&(p<lo+(shape-2)*step),axis=1)
 p=(p[active]-lo)/step
 idx=np.floor(p).astype(int);f=p-idx;grid=np.zeros(shape,dtype='float32')
 for c in corner:
  q=idx+c;weight=np.prod(np.where(c,f,1-f),axis=1)
  np.add.at(grid,(q[:,0],q[:,1],q[:,2]),weight)
 grid=gaussian_filter(grid,.80)
 points,faces=surface(grid)
 np.savez(OUT/f'{frame:04d}.npz',vertices=points,faces=faces)
 print(frame,len(points),len(faces),flush=True)
parser=argparse.ArgumentParser();parser.add_argument('--frame',type=int);args=parser.parse_args()
frames=[args.frame] if args.frame is not None else range(144)
for frame in frames:bake(frame)
