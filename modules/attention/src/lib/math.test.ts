// @ts-nocheck
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeAttention,matmul,softmax,spatialToToken,tokenToSpatial,contextTokens} from './math.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);
test('softmax stays finite for large logits and sums to one',()=>{
 const p=softmax([10001,10002,10003]);close(p.reduce((a,b)=>a+b),1);close(p[2],.6652409557748218);
});
test('matrix product gives the independently calculated result',()=>assert.deepEqual(matmul([[1,2],[3,4]],[[5,6],[7,8]]),[[19,22],[43,50]]));
test('all spatial tokens round trip, including #335',()=>{
 assert.equal(spatialToToken(10,15,32),335);
 for(let i=0;i<1024;i++){const p=tokenToSpatial(i,32);assert.equal(spatialToToken(p.row,p.col,32),i);}
});
test('teaching query and weighted value match hand calculation',()=>{
 const d=computeAttention('a red car on the road','teaching','cross');
 [0.75,-0.48,1.03,.62].forEach((x,i)=>close(d.q[0][i],x));
 close(d.raw[0][0],.75*1.4+(-.48)*.1+1.03*(-.2));
 d.weights.forEach(row=>close(row.reduce((a,b)=>a+b),1));
 for(let c=0;c<4;c++)close(d.output[0][c],d.weights[0].reduce((s,w,j)=>s+w*d.v[j][c],0));
 assert.notDeepEqual(d.k,d.v);
});
test('prompt changes data and self attention uses image context',()=>{
 const a=computeAttention('a red car on the road','teaching','cross');
 const b=computeAttention('a blue dog on the grass','teaching','cross');
 assert.notDeepEqual(a.output,b.output);assert.deepEqual(b.tokens,['blue','dog','grass']);
 const s=computeAttention('','teaching','self');assert.equal(s.k.length,4);assert.deepEqual(s.c,s.x);
 assert.equal(contextTokens('', 'sd').length,77);assert.equal(contextTokens('a blue dog', 'sd').length,77);
});
test('two teaching heads split and concatenate with a shared input',()=>{
 const a=computeAttention('red car road','teaching','cross',0,true);
 const b=computeAttention('red car road','teaching','cross',1,true);
 assert.equal(a.q[0].length,2);assert.equal(b.q[0].length,2);
 assert.deepEqual(a.x,b.x);assert.deepEqual(a.projected,b.projected);
 assert.deepEqual(a.concatenated[0],[...a.output[0],...b.output[0]]);
 close(a.q[0][0],.75);close(b.q[0][0],1.03);
 assert.notDeepEqual(a.weights,b.weights);
});
