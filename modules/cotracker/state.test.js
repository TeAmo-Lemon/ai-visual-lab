import test from 'node:test';
import assert from 'node:assert/strict';
import {initialize,illustrativeTrack,samplingPatch,patchPairs,pairIndices,tokenRelations,onlineWindow,teacherForBatch,tokenDimensions,safeChapter,PROXY_FLOW,TARGETS,FRAMES,targetAt} from './state.js';
test('query position is copied across frames; changing query changes all initial guesses',()=>{
 for(let q=0;q<FRAMES;q++)for(let point=0;point<3;point++){const states=initialize(q,point);assert.equal(states.length,FRAMES);for(const s of states)assert.deepEqual(s,{...targetAt(q,point),c:0,v:0});}
 assert.notDeepEqual(initialize(0),initialize(4));
});
test('each illustrative iteration moves the sampling center, while the query remains anchored',()=>{
 for(let m=0;m<4;m++)assert.notDeepEqual(samplingPatch(m).center,samplingPatch(m+1).center);
 for(let m=0;m<=4;m++)assert.deepEqual(illustrativeTrack(m,1)[1],TARGETS[1]);
 assert.deepEqual(samplingPatch(4).center,TARGETS[5]);
 assert.equal(samplingPatch(2,1,4,2).radius,4*samplingPatch(2,1,4,0).radius);
});
test('two 3x3 patches produce every one of 81 spatial pairs',()=>{
 const pairs=Array.from({length:9},(_,q)=>patchPairs(q)).flat();
 assert.equal(new Set(pairs.map(p=>`${p.queryCell}:${p.trackCell}`)).size,81);
 assert.deepEqual(pairIndices(5,6),{uq:2,vq:1,ut:0,vt:2});
});
test('time attention keeps point identity; group flow passes through proxies',()=>{
 assert.equal(new Set(tokenRelations('time',2,1).map(x=>x.point)).size,1);
 assert.equal(tokenRelations('time',2,1).length,FRAMES);
 assert.equal(tokenRelations('group',2,1).filter(x=>x.type==='real').length,3);
 assert.equal(tokenRelations('group',2,1).filter(x=>x.type==='proxy').length,2);
 assert.deepEqual(PROXY_FLOW.map(x=>`${x.from}->${x.to}`),['real->proxy','proxy->proxy','proxy->real']);
});
test('token dimensions add up before projecting to the hidden state',()=>{
 const d=tokenDimensions();assert.equal(d.correlation+d.motion+d.status,d.input);assert.equal(d.input,1110);assert.equal(d.hidden,384);
});
test('invalid chapter hashes fall back and the previous evidence bookmark still resolves',()=>{
 const chapters=['task','architecture','recap'];assert.equal(safeChapter('invalid',chapters),'task');assert.equal(safeChapter('evidence',chapters),'recap');assert.equal(safeChapter('architecture',chapters),'architecture');
});
test('online windows share exactly 8 inherited frames and advance by 8',()=>{
 for(let i=1;i<4;i++){const a=onlineWindow(i-1),b=onlineWindow(i);assert.deepEqual(a.frames.filter(t=>b.frames.includes(t)),b.inherited);assert.equal(b.introduced.length,8);assert.equal(b.start-a.start,8);}
});
test('batch selects one teacher from the full pool rather than combining predictions',()=>{
 for(let i=0;i<4;i++)assert.equal(teacherForBatch(()=>(i+.5)/4),i);
 assert.equal(typeof teacherForBatch(()=>.4),'number');
});
