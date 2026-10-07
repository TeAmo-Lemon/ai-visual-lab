import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attention,headContributions,matmul,softmax,norm,runModel,tokenize,position} from './engine.ts';
test('generation projects the last position, then recomputes after appending while preserving causal history',()=>{
 const source=['I','love','transformers'],prefix=['<BOS>','I','love'];
 for(const [d,h,gpt] of [[4,2,false],[8,4,false],[4,2,true]] as const){
  const before=runModel(source,prefix,d,h,true,true,gpt).decoder;
  const last=matmul([before.out.at(-1)!],before.Wout)[0];
  assert.deepEqual(last,before.logits.at(-1));
  assert.deepEqual(softmax(last),before.probs.at(-1));
  assert.notDeepEqual(before.probs.at(-1),before.probs[0]);
  const after=runModel(source,[...prefix,'AI'],d,h,true,true,gpt).decoder;
  assert.equal(after.out.length,prefix.length+1);
  before.out.forEach((row,i)=>row.forEach((v,j)=>assert.ok(Math.abs(v-after.out[i][j])<1e-8)));
  assert.notDeepEqual(after.probs.at(-1),before.probs.at(-1));
 }
});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('matrix product agrees with hand calculation',()=>assert.deepEqual(matmul([[1,2],[3,4]],[[5,6],[7,8]]),[[19,22],[43,50]]));
test('softmax is stable and masked positions are zero',()=>{const p=softmax([1000,1001,-Infinity]);close(p.reduce((a,b)=>a+b),1);close(p[2],0);close(p[1]/p[0],Math.E);});
test('layer norm operates independently over features',()=>{const a=norm([[1,3],[100,100]]);close(a[0].reduce((a,b)=>a+b),0);assert.deepEqual(a[1],[0,0]);});
test('causal attention cannot see future token values',()=>{const a=[[1,2,3,4],[3,2,1,0],[9,8,7,6]],b=[...a.slice(0,2),[100,-100,99,-99]];const x=attention(a,a,2,1,true),y=attention(b,b,2,1,true);assert.deepEqual(x.out.slice(0,2),y.out.slice(0,2));x.heads.forEach(h=>h.A.forEach((r,i)=>r.forEach((v,j)=>{if(j>i)close(v,0);})));});
test('weighted values and concat are actual computed outputs',()=>{const a=attention([[1,2,3,4],[4,3,2,1]],[[1,2,3,4],[4,3,2,1]],2);a.heads.forEach(h=>assert.deepEqual(h.Z,matmul(h.A,h.V)));assert.deepEqual(a.concat[0],a.heads.flatMap(h=>h.Z[0]));});
test('encoder memory supplies cross K/V with rectangular attention',()=>{const a=runModel(['I','love','transformers'],['<BOS>','I'],4,2);const h=a.decoder.cross.heads[0];assert.deepEqual(h.K,matmul(a.memory,h.Wk));assert.equal(h.A.length,2);assert.equal(h.A[0].length,3);assert.equal(a.decoder.probs[0].length,8);close(a.decoder.probs[0].reduce((a,b)=>a+b),1);});
test('position toggle and source change propagate; GPT ignores source',()=>{const a=runModel(['I','love'],['<BOS>','I'],4,2),b=runModel(['cats','AI'],['<BOS>','I'],4,2),c=runModel(['I','love'],['<BOS>','I'],4,2,false);assert.notDeepEqual(a.decoder.out,b.decoder.out);assert.notDeepEqual(a.emb.X,c.emb.X);assert.deepEqual(runModel(['I'],['I'],4,2,true,true,true).decoder.out,runModel(['cats'],['I'],4,2,true,true,true).decoder.out);});
test('four heads and stack preserve model dimension',()=>{const a=runModel(['I','love','transformers'],['I'],8,4);a.layers.forEach(l=>{assert.equal(l.out[0].length,8);assert.equal(l.attn.heads.length,4);assert.equal(l.attn.heads[0].Q[0].length,2);});});
test('tokenizer handles punctuation and Chinese without empty tensors',()=>{assert.deepEqual(tokenize('I love transformers.'),['I','love','transformers','.']);assert.ok(tokenize('你好 世界').length>0);assert.deepEqual(position(1,4),[[0,1,0,1]]);});
test('Wₒ head contributions match a hand-calculated example',()=>{
  const contributions=headContributions([[1,2],[3,4]],[[1,2],[3,4],[5,6],[7,8]]);
  assert.deepEqual(contributions,[[7,10],[43,50]]);
  assert.deepEqual(matmul([[1,2,3,4]],[[1,2],[3,4],[5,6],[7,8]])[0],[50,60]);
});
test('individual head contributions sum to the actual output; zeroing one preserves the others',()=>{
  for(const [d,h] of [[4,2],[8,4]]){
    const model=runModel(['I','love','transformers'],['I'],d,h);
    for(const layer of model.layers)for(let q=0;q<3;q++){
      const a=layer.attn,c=headContributions(a.heads.map(head=>head.Z[q]),a.Wo);
      for(let j=0;j<d;j++)close(c.reduce((sum,row)=>sum+row[j],0),a.out[q][j]);
      const withoutFirst=a.concat[q].map((v,j)=>j<d/h?0:v);
      const output=matmul([withoutFirst],a.Wo)[0];
      for(let j=0;j<d;j++)close(c.slice(1).reduce((sum,row)=>sum+row[j],0),output[j]);
      for(const head of a.heads)assert.deepEqual(head.Q,matmul(layer.x,head.Wq));
    }
  }
});
