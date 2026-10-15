import * as T from './vendor/three.module.js';
import ronald from './assets/cinema/models/ronald.mjs';
import grimace from './assets/cinema/models/grimace.mjs';
import hamburglar from './assets/cinema/models/hamburglar.mjs';
import birdie from './assets/cinema/models/birdie.mjs';

export const MACCAS_MODELS=Object.freeze({ronald,grimace,hamburglar,birdie});

// Decode pre-indexed OBJ data. No network model parser or third-party service is
// needed at runtime; each model retains the supplied UVs and smooth normals.
export function mascotGeometry(id){
 const model=MACCAS_MODELS[id];if(!model)throw new Error('Unknown restaurant mascot: '+id);
 const raw=atob(model.packed),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const n=model.vertexCount,g=new T.BufferGeometry();
 g.setAttribute('position',new T.BufferAttribute(new Float32Array(bytes.buffer,0,n*3),3));
 g.setAttribute('normal',new T.BufferAttribute(new Float32Array(bytes.buffer,n*12,n*3),3));
 g.setAttribute('uv',new T.BufferAttribute(new Float32Array(bytes.buffer,n*24,n*2),2));
 g.setIndex(new T.BufferAttribute(new Uint16Array(bytes.buffer,n*32,model.indexCount),1));
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
