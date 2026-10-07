import test from 'node:test';
import assert from 'node:assert/strict';
import {initialize,illustrativeTrack,samplingPatch,patchPairs,tokenRelations,onlineWindow,teacherForBatch,PROXY_FLOW,TARGETS} from './state.js';
test('query position is copied across frames; changing query changes all initial guesses',()=>{
 for(let q=0;q<5;q++){const states=initialize(q);assert.equal(states.length,5);for(const s of states)assert.deepEqual(s,{...TARGETS[q],c:0,v:0});}
 assert.notDeepEqual(initialize(0),initialize(4));
});
test('each illustrative iteration moves the sampling center, while the query remains anchored',()=>{
 for(let m=0;m<4;m++)assert.notDeepEqual(samplingPatch(m).center,samplingPatch(m+1).center);
 for(let m=0;m<=4;m++)assert.deepEqual(illustrativeTrack(m,1)[1],TARGETS[1]);
 assert.deepEqual(samplingPatch(4).center,TARGETS[4]);
 assert.equal(samplingPatch(2,1,4,2).radius,4*samplingPatch(2,1,4,0).radius);
});
test('two 3x3 patches produce every one of 81 spatial pairs',()=>{
 const pairs=Array.from({length:9},(_,q)=>patchPairs(q)).flat();
 assert.equal(new Set(pairs.map(p=>`${p.queryCell}:${p.trackCell}`)).size,81);
});
test('time attention keeps point identity; group flow passes through proxies',()=>{
 assert.equal(new Set(tokenRelations('time',2,1).map(x=>x.point)).size,1);
 assert.equal(tokenRelations('group',2,1).filter(x=>x.type==='proxy').length,2);
 assert.deepEqual(PROXY_FLOW.map(x=>`${x.from}->${x.to}`),['real->proxy','proxy->proxy','proxy->real']);
});
test('online windows share exactly 8 inherited frames and advance by 8',()=>{
 for(let i=1;i<4;i++){const a=onlineWindow(i-1),b=onlineWindow(i);assert.deepEqual(a.frames.filter(t=>b.frames.includes(t)),b.inherited);assert.equal(b.introduced.length,8);assert.equal(b.start-a.start,8);}
});
test('batch selects one teacher from the full pool rather than combining predictions',()=>{
 for(let i=0;i<4;i++)assert.equal(teacherForBatch(()=>(i+.5)/4),i);
 assert.equal(typeof teacherForBatch(()=>.4),'number');
});
