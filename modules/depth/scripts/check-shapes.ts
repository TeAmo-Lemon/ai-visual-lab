import assert from 'node:assert/strict';
import {getModel,tensors,resizeShape,history,architecture,type Config,type Size,type Version} from '../src/model.ts';
const base:Config={mode:'real',version:'v2',size:'l',rawH:518,rawW:518,target:518};
let cases=0;
for(const version of ['v1','v2'] as Version[])for(const size of ['s','b','l','g'] as Size[]){if(version==='v1'&&size==='g')continue;for(const [h,w] of [[518,518],[480,640],[1080,1920],[801,403],[333,777],[56,56]]){
 const config={...base,version,size,rawH:h,rawW:w},m=getModel(config),t=tensors(config);
 assert.equal(m.h%14,0);assert.equal(m.w%14,0);assert.ok(m.h>=518&&m.w>=518);
 assert.equal(m.ph*m.pw,m.n);assert.deepEqual(t.encoder.shape,[1,m.n+1,m.dim]);
 for(let j=1;j<=4;j++){assert.equal(t[`f${j}`].shape.reduce((a,b)=>a*b,1),t[`reshape${j}`].shape.reduce((a,b)=>a*b,1));assert.equal(t[`scratch${j}`].shape[1],m.features)}
 for(let j=3;j>=1;j--)assert.deepEqual(t[`fusion${j+1}`].shape,t[`scratch${j}`].shape);
 assert.deepEqual(t.prediction.shape,[1,1,m.h,m.w]);assert.deepEqual(t.depth.shape,[h,w]);
 for(let branch=0;branch<4;branch++){const hs=history(config,branch);assert.equal(new Set(hs).size,hs.length);assert.ok(hs.every(id=>id in t));const route=hs.filter(id=>id.startsWith('fusion'));assert.deepEqual(route,Array.from({length:branch+1},(_,i)=>`fusion${branch+1-i}`))}
 cases++;
}}
const t=tensors(base);assert.deepEqual(t.resize4.shape,[1,1024,19,19]);assert.deepEqual(t.fusion4.shape,[1,256,37,37]);assert.deepEqual(t.fusion3.shape,[1,256,74,74]);assert.deepEqual(t.fusion2.shape,[1,256,148,148]);assert.deepEqual(t.fusion1.shape,[1,256,296,296]);assert.deepEqual(t.head.shape,[1,128,296,296]);assert.deepEqual(t.headUp.shape,[1,128,518,518]);
assert.deepEqual(resizeShape(480,640,518),[518,686]);assert.deepEqual(resizeShape(1080,1920,518),[518,924]);
const toy=tensors({...base,mode:'teaching'});assert.deepEqual(toy.f1.shape,[1,16,8]);assert.deepEqual(toy.resize4.shape,[1,8,2,2]);assert.deepEqual(toy.fusion4.shape,[1,8,4,4]);assert.deepEqual(toy.fusion1.shape,[1,8,32,32]);assert.deepEqual(toy.prediction.shape,[1,1,56,56]);
assert.deepEqual(architecture.models.l.layers,[4,11,17,23]);assert.deepEqual(architecture.models.l.v1.layers,[20,21,22,23]);
console.log(`Verified ${cases} model/aspect-ratio configurations, odd-grid fusion alignment, CLS boundaries, toy mode and branch histories.`);
