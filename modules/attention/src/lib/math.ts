export type Matrix = number[][];
export type Mode = 'teaching' | 'sd';
export type AttentionKind = 'cross' | 'self';

export const WQ: Matrix = [[1, .2, 0, 0], [0, .8, .1, 0], [.5, 0, 1, .2], [0, .1, 0, 1]];
export const WK: Matrix = [[1.4, .1, -.2, 0], [.2, .8, .1, 1.1], [-.3, .2, 1.2, .2], [.1, .1, 0, .9]];
export const WV: Matrix = [[1, .2, .1, 0], [.1, 1.1, -.3, .4], [0, .3, 1, .5], [.2, -.1, .2, .8]];
export const WO: Matrix = [[.9, .1, 0, 0], [0, 1, .1, 0], [.1, 0, .8, 0], [0, 0, .1, .9]];
export const TEACHING_X: Matrix = [[.2, -.7, 1.1, .4], [.9, .2, -.4, .7], [1.4, 1.6, .2, .3], [-.2, .4, 1.3, .1]];
export const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const transpose = (a: Matrix): Matrix => a[0].map((_, i) => a.map(row => row[i]));
export const matmul = (a: Matrix, b: Matrix): Matrix => {
  if (!a.length || !b.length || a[0].length !== b.length) throw new Error('Matrix dimensions do not agree');
  const bt = transpose(b);
  return a.map(row => bt.map(col => dot(row, col)));
};
export function softmax(row: number[]): number[] {
  const max = Math.max(...row);
  const e = row.map(x => Math.exp(x - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}
export const add = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);
export const fmt = (x: number, places = 3) => x.toFixed(places).replace(/^-0\.000$/, '0.000');
export const vector = (v: number[]) => `[${v.map(x => fmt(x, 2)).join(', ')}]`;

const STOP = new Set(['a','an','the','on','in','of','at','with','and','to','is']);
export function tokenize(prompt: string) {
  return prompt.toLowerCase().match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)?.slice(0, 75) ?? [];
}
export function contextTokens(prompt: string, mode: Mode) {
  const words = tokenize(prompt);
  if (mode === 'sd') return ['<BOS>', ...words, '<EOS>', ...Array(Math.max(0, 75 - words.length)).fill('<PAD>')];
  const content = words.filter(w => !STOP.has(w));
  const selected = (content.length ? content : words).slice(0, 3);
  return [...selected, ...Array(Math.max(0, 3 - selected.length)).fill('<empty>')];
}
export function embedding(word: string): number[] {
  const known: Record<string, number[]> = {
    red:[1,0,0,0], blue:[.7,0,0,.8], car:[0,1,0,0], dog:[0,.8,.1,.6], road:[0,0,1,0], grass:[0,.1,.7,.8],
    '<BOS>':[.05,.05,0,0], '<EOS>':[.02,.02,.02,0], '<PAD>':[0,0,0,0], '<empty>':[0,0,0,0]
  };
  if (known[word]) return known[word];
  const hash = [...word].reduce((a,c)=> (a * 31 + c.codePointAt(0)!) >>> 0, 7);
  return [0,1,2,3].map(i => .18 * Math.sin((hash % 997) * (i + 1)));
}
export function imageVector(index: number, mode: Mode, head = 0) {
  const base = mode === 'teaching' ? TEACHING_X[index % 4] : [
    .7 + .7 * Math.sin(index / 83),
    .8 + .8 * Math.cos(index / 67),
    .4 + .7 * Math.sin(index / 51 + 1),
    .3 + .2 * Math.cos(index / 23)
  ];
  // Each demonstration head uses a different mock projection. These four
  // dimensions are a numerical proxy, never claimed to be trained SD weights.
  return base.map((v,i)=>v * (1 + .28 * Math.sin(head * 1.8 + i) * (head ? 1 : 0)));
}
export function computeAttention(prompt: string, mode: Mode, kind: AttentionKind, head = 0, multi = false) {
  const count = mode === 'teaching' ? 4 : 1024;
  const x = Array.from({length:count},(_,i)=>imageVector(i,mode));
  const tokens = kind === 'cross' ? contextTokens(prompt,mode) : x.map((_,i)=>`img #${i}`);
  const c = kind === 'cross' ? tokens.map(embedding) : x;
  const project=(a:Matrix,w:Matrix,offset:number)=>matmul(a,w).map(row=>row.map((v,i)=>v*(mode==='sd'&&head?1+.28*Math.sin(head*1.8+i+offset):1)));
  const fullQ = project(x,WQ,0), fullK = project(c,WK,1), fullV = project(c,WV,2);
  const split = (m:Matrix,h:number) => m.map(row=>row.slice(h*2,h*2+2));
  const exactMulti = multi && mode === 'teaching';
  const q = exactMulti?split(fullQ,head):fullQ, k = exactMulti?split(fullK,head):fullK, v = exactMulti?split(fullV,head):fullV;
  const raw = matmul(q,transpose(k));
  // The inspectable numeric slice has d=4, so scaling is always sqrt(4).
  const scale = Math.sqrt(q[0].length);
  const scaled = raw.map(row=>row.map(s=>s / scale));
  const weights = scaled.map(softmax);
  const output = matmul(weights,v);
  const allHeadOutputs = exactMulti ? [0,1].map(h=>{
    const logits=matmul(split(fullQ,h),transpose(split(fullK,h))).map(row=>row.map(s=>s/Math.sqrt(2)));
    return matmul(logits.map(softmax),split(fullV,h));
  }) : [output];
  const concatenated = exactMulti ? x.map((_,i)=>[...allHeadOutputs[0][i],...allHeadOutputs[1][i]]) : output;
  const projected = matmul(concatenated,WO);
  return {x,c,q,k,v,raw,scaled,weights,output,projected,tokens,scale,concatenated,allHeadOutputs,headOffset:exactMulti?head*2:0};
}

// Index arithmetic demonstrates the exact BCHW → B(HW)C permutation.
export const spatialToToken = (row: number, col: number, width: number) => row * width + col;
export const tokenToSpatial = (index: number, width: number) => ({row:Math.floor(index / width),col:index % width});
