import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainHeight,makeTerrainGeometry,makeGrass,groundIsOccupied,FIELD_SIZE,FIELD_PALETTES} from '../meadow-terrain.mjs';
import {BUILD_RADIUS} from '../world-rules.mjs';
import {initialState,validateState} from '../domain.mjs';
import {Matrix4,ShaderLib} from '../vendor/three.module.js';
test('Rolling terrain keeps the entire saved arrangement area level, with a smooth transition to hills',()=>{
 for(let x=-14;x<=14;x+=.5)for(let z=-14;z<=14;z+=.5)if(Math.hypot(x,z)<=BUILD_RADIUS)assert.equal(Math.abs(terrainHeight(x,z)),0);
 let min=Infinity,max=-Infinity;for(let x=-350;x<=350;x+=7)for(let z=-350;z<=350;z+=7){const h=terrainHeight(x,z);assert.ok(Number.isFinite(h));min=Math.min(min,h);max=Math.max(max,h);const gradient=Math.hypot((terrainHeight(x+.1,z)-terrainHeight(x-.1,z))/.2,(terrainHeight(x,z+.1)-terrainHeight(x,z-.1))/.2);assert.ok(gradient<.8);}
 assert.ok(max-min>15,'The landscape must have genuine elevation variation');
});
test('The terrain boundary stays beyond the fog for every lighting mood and allowed camera distance',()=>{
 for(const palette of Object.values(FIELD_PALETTES)){assert.ok(palette.fogFar<FIELD_SIZE/2-90);assert.ok(palette.fogNear<palette.fogFar);}
 const g=makeTerrainGeometry();for(const name of ['position','normal','color'])for(const n of g.attributes[name].array)assert.ok(Number.isFinite(n));assert.ok(g.boundingSphere.radius>FIELD_SIZE/2);g.dispose();
});
test('Grass is deterministic, has volumetric blades, and leaves owned item footprints clear',()=>{
 const placed=[{id:'cabin',placement:{x:0,z:0,rotation:0}},{id:'bridge',placement:{x:6,z:0,rotation:90}}],a=makeGrass('meadow',placed,5000),b=makeGrass('meadow',placed,5000),mat=new Matrix4();assert.ok(a.meshes.reduce((n,m)=>n+m.count,0)>4000);for(let j=0;j<a.meshes.length;j++){assert.equal(a.meshes[j].count,b.meshes[j].count);assert.deepEqual(a.meshes[j].instanceMatrix.array,b.meshes[j].instanceMatrix.array);}
 for(const mesh of a.meshes)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,mat);assert.ok(!groundIsOccupied(mat.elements[12],mat.elements[14],placed));assert.ok(Math.abs(mat.elements[13]-(terrainHeight(mat.elements[12],mat.elements[14])-.1))<1e-4);}
 a.mesh.geometry.computeBoundingBox();assert.ok(a.mesh.geometry.boundingBox.max.y>.9);assert.ok(a.mesh.geometry.boundingBox.max.z-a.mesh.geometry.boundingBox.min.z>.1);
 for(const grass of [a,b]){for(const mesh of grass.meshes){mesh.dispose();mesh.geometry.dispose();}grass.mesh.material.dispose();}
});
test('Grass movement and arranging uniforms are bound to the shipped Three.js shader template',()=>{
 const g=makeGrass('meadow',[],10),shader={vertexShader:ShaderLib.lambert.vertexShader,uniforms:{}};assert.ok(shader.vertexShader.includes('#include <begin_vertex>'));g.mesh.material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('float shortGrass='));assert.ok(shader.vertexShader.includes('transformed.x+=wave'));g.update(12,false,true);assert.equal(shader.uniforms.fieldTime.value,12);assert.equal(shader.uniforms.fieldBreeze.value,0);assert.equal(shader.uniforms.fieldArranging.value,1);g.update(15,true,false);assert.equal(shader.uniforms.fieldBreeze.value,1);assert.equal(shader.uniforms.fieldArranging.value,0);for(const mesh of g.meshes){mesh.dispose();mesh.geometry.dispose();}g.mesh.material.dispose();
});
test('The old default name updates while custom names and the still-grass preference survive',()=>{
 const s=initialState();s.settings.worldName='The Outlook';delete s.settings.breeze;const migrated=validateState(s);assert.equal(migrated.settings.worldName,'The Meadow');assert.equal(migrated.settings.breeze,true);assert.equal(migrated.islands[0].id,'outlook');s.settings.worldName='My quiet place';s.settings.breeze=false;const custom=validateState(s);assert.equal(custom.settings.worldName,'My quiet place');assert.equal(custom.settings.breeze,false);
});
