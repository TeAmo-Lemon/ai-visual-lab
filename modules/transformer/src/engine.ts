export type Matrix = number[][];
export const VOCAB = ['I', 'love', 'transformers', 'AI', 'coding', 'cats', '.', '<EOS>'];
export const fmt = (v: number, n = 2) => Number.isFinite(v) ? v.toFixed(n) : '−∞';
export const transpose = (a: Matrix): Matrix => a[0].map((_, j) => a.map(r => r[j]));
export function matmul(a: Matrix, b: Matrix): Matrix {
  if (!a.length || !b.length || a[0].length !== b.length) throw new Error('Matrix dimensions do not match');
  return a.map(row => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
}
export const add = (a: Matrix, b: Matrix): Matrix => a.map((r, i) => r.map((v, j) => v + b[i][j]));
export function softmax(row: number[]) { const max = Math.max(...row); const e = row.map(v => Math.exp(v - max)); const sum = e.reduce((a,b) => a+b,0); return e.map(v => v/sum); }
export function norm(x: Matrix) { return x.map(r => { const mean = r.reduce((a,b)=>a+b,0)/r.length; const variance = r.reduce((a,b)=>a+(b-mean)**2,0)/r.length; return r.map(v=>(v-mean)/Math.sqrt(variance+1e-5)); }); }
export function weights(rows: number, cols: number, seed: number): Matrix { return Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>Math.sin((i+1)*7.13+(j+1)*3.71+seed*1.37)*0.65/Math.sqrt(rows/2))); }
export function tokenize(text: string) { return (text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?|[^\s\p{L}\p{N}]/gu)||[]).slice(0,8); }
export function tokenId(token: string) { const known: Record<string,number> = {I:40,love:1842,transformers:9281,'<BOS>':1,'<EOS>':2}; return known[token] ?? (Array.from(token).reduce((n,c)=>(n*31+c.codePointAt(0)!)%9000,7)+100); }
export function embeddings(tokens: string[], d: number) { const fixed: Record<string,number[]> = {I:[.2,.8,-.3,.1],love:[-.1,.6,.2,.9],transformers:[.7,-.2,.5,.3]}; return tokens.map(t=>Array.from({length:d},(_,i)=>fixed[t]?.[i]??Math.sin(tokenId(t)*.01+i*2.13)*.7)); }
export function position(n: number,d: number): Matrix { return Array.from({length:n},(_,p)=>Array.from({length:d},(_,i)=>{const a=p/10000**(2*Math.floor(i/2)/d);return i%2?Math.cos(a):Math.sin(a);})); }
export function embedInput(tokens: string[], d: number, withPosition: boolean) { const E=embeddings(tokens,d), scaledE=E.map(r=>r.map(v=>v*Math.sqrt(d))), P=position(tokens.length,d); return {E,scaledE,P,X:withPosition?add(scaledE,P):scaledE}; }
export function attention(x: Matrix, memory: Matrix, h: number, seed=1, causal=false) {
  const d=x[0].length, dk=d/h;
  const heads=Array.from({length:h},(_,i)=>{const Wq=weights(d,dk,seed+i*7),Wk=weights(d,dk,seed+1+i*7),Wv=weights(d,dk,seed+2+i*7);const Q=matmul(x,Wq),K=matmul(memory,Wk),V=matmul(memory,Wv);const scores=matmul(Q,transpose(K)),scaled=scores.map(r=>r.map(v=>v/Math.sqrt(dk))),masked=scaled.map((r,q)=>r.map((v,k)=>causal&&k>q?-Infinity:v)),A=masked.map(softmax),Z=matmul(A,V);return {Wq,Wk,Wv,Q,K,V,scores,scaled,masked,A,Z};});
  const concat=x.map((_,i)=>heads.flatMap(a=>a.Z[i])),Wo=weights(d,d,seed+30),out=matmul(concat,Wo);
  return {heads,concat,Wo,out};
}
// Each head occupies consecutive feature rows of Wₒ after concatenation.
export function headContributions(headRows: Matrix, Wo: Matrix): Matrix {
  let offset=0;
  return headRows.map(row=>{const block=Wo.slice(offset,offset+row.length);offset+=row.length;return matmul([row],block)[0];});
}
export function ffn(x: Matrix, seed=20) { const d=x[0].length,W1=weights(d,d*2,seed),W2=weights(d*2,d,seed+1),b1=Array.from({length:d*2},(_,i)=>.05*Math.sin(i)),b2=Array.from({length:d},(_,i)=>.03*Math.cos(i)); const hidden=matmul(x,W1).map(r=>r.map((v,j)=>v+b1[j])),activated=hidden.map(r=>r.map(v=>Math.max(0,v))),out=matmul(activated,W2).map(r=>r.map((v,j)=>v+b2[j]));return {W1,W2,b1,b2,hidden,activated,out}; }
export function encoderBlock(x: Matrix,h: number,seed: number) { const attn=attention(x,x,h,seed),res1=add(x,attn.out),norm1=norm(res1),feed=ffn(norm1,seed+40),res2=add(norm1,feed.out),out=norm(res2);return {x,attn,res1,norm1,feed,res2,out}; }
export function runModel(tokens: string[],target: string[],d: number,h: number,withPosition=true,mask=true,gpt=false) {
  const emb=embedInput(tokens,d,withPosition); let x=emb.X;
  const layers=Array.from({length:3},(_,i)=>{const block=encoderBlock(x,h,1+i*53);x=block.out;return block;});
  const decEmb=embedInput(target,d,withPosition),self=attention(decEmb.X,decEmb.X,h,101,mask),selfRes=add(decEmb.X,self.out),selfNorm=norm(selfRes),cross=attention(selfNorm,x,h,151),crossRes=add(selfNorm,cross.out),crossNorm=gpt?selfNorm:norm(crossRes),feed=ffn(crossNorm,202),res=add(crossNorm,feed.out),out=norm(res),Wout=weights(d,VOCAB.length,301),logits=matmul(out,Wout),probs=logits.map(softmax);
  return {emb,layers,memory:x,decoder:{emb:decEmb,self,selfRes,selfNorm,cross,crossRes,crossNorm,feed,res,out,Wout,logits,probs}};
}
