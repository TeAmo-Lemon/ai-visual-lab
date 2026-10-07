import {useEffect, useId, useState, type CSSProperties} from 'react';
import {ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Play, RotateCcw} from 'lucide-react';
import {transpose, type Matrix, type attention} from './engine';
import './multihead.css';

type Attention = ReturnType<typeof attention>;
const colors = ['#915336', '#48602f', '#76516e', '#84611f'];
const backgrounds = ['#f2dcc8', '#dce8c9', '#e6d4e2', '#eadcaf'];
const phases = ['投影矩阵', 'Attention', '矩阵拼接', '输出投影'];
const tone = (head:number) => ({'--matrix-ink':colors[head], '--matrix-fill':backgrounds[head]} as CSSProperties);

function MatrixGlyph({symbol,data,head=0,query=-1,labels,columnsByHead,rowsByHead,activeHead=-1,filledHeads=Infinity,compact=false,mixed=false,onHead}: {
  symbol:string;data:Matrix;head?:number;query?:number;labels?:string[];columnsByHead?:number;rowsByHead?:number;
  activeHead?:number;filledHeads?:number;compact?:boolean;mixed?:boolean;onHead?:(head:number)=>void;
}) {
  const rows=data.length,cols=data[0].length;
  const headFor=(r:number,c:number)=>columnsByHead?Math.floor(c/columnsByHead):rowsByHead?Math.floor(r/rowsByHead):head;
  return <div className={`mm-matrix ${compact?'compact':''}`} style={mixed?{'--matrix-ink':'#5c7047'} as CSSProperties:tone(head)} data-matrix={symbol} data-rows={rows} data-cols={cols}>
    <div className="mm-matrix-heading"><strong>{symbol}</strong><code>{rows} × {cols}</code></div>
    <div className="mm-matrix-body">
      {labels&&<div className="mm-row-labels">{labels.map((t,r)=><span key={r} title={t} className={query===r?'selected':''}>{t}</span>)}</div>}
      <div className="mm-bracket"><div className="mm-cells" style={{gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,'--matrix-width':`${cols*28}px`,'--matrix-cols':cols} as CSSProperties} role={onHead?'group':'img'} aria-label={`${symbol}，${rows} 行 ${cols} 列矩阵`}>
        {data.flatMap((row,r)=>row.map((_,c)=>{const owner=headFor(r,c),filled=owner<filledHeads,dim=activeHead>=0&&owner!==activeHead&&(!!columnsByHead||!!rowsByHead);const style={background:mixed?'#e5eadb':filled?backgrounds[owner]:'#eeeee6',borderColor:mixed?'#6d8052':filled?colors[owner]:'#c8cbbf',opacity:dim?.6:1};
          return onHead?<button key={`${r}-${c}`} className={`mm-cell ${query===r?'query-row':''} ${filled?'filled':'empty'}`} style={style} aria-label={`${symbol} 第 ${r+1} 行，第 ${c+1} 列，Head ${owner+1}`} onClick={()=>onHead(owner)}/>:<span key={`${r}-${c}`} className={`mm-cell ${query===r?'query-row':''}`} style={style} title={`${symbol}：第 ${r+1} 行，第 ${c+1} 列`}/>;
        }))}
      </div></div>
    </div>
    {columnsByHead&&<div className="mm-column-owners" style={{paddingLeft:labels?'60px':undefined}}>{Array.from({length:cols/columnsByHead},(_,i)=><button key={i} style={tone(i)} aria-pressed={activeHead===i} onClick={()=>onHead?.(i)}>H{i+1}<span>{i*columnsByHead+1}–{(i+1)*columnsByHead} 列</span></button>)}</div>}
  </div>;
}

function Operator({children}:{children:React.ReactNode}){return <span className="mm-operator">{children}</span>;}

function ConcatBoard({attn,tokens,query,head,onHead}:{attn:Attention;tokens:string[];query:number;head:number;onHead:(i:number)=>void}) {
  const h=attn.heads.length,dk=attn.heads[0].Z[0].length,d=h*dk;
  const [joined,setJoined]=useState(h),[running,setRunning]=useState(false);
  useEffect(()=>{setJoined(h);setRunning(false);},[h]);
  useEffect(()=>{if(!running)return;if(joined>=h){setRunning(false);return;}const id=setTimeout(()=>setJoined(n=>n+1),750);return()=>clearTimeout(id);},[running,joined,h]);
  return <div className="mm-concat-board">
    <div className="mm-caption"><strong>把各头的输出按列接在一起</strong><span>行对应词，列对应特征。{tokens.length} 行保持不变，{h} × {dk} 列 → {d} 列。</span></div>
    <div className="mm-concat-sources" style={{gridTemplateColumns:`repeat(${h},minmax(0,1fr))`}}>{attn.heads.map((a,i)=><div className={`mm-source ${i===head?'active':''} ${i<joined?'joined':''}`} key={i} style={tone(i)}><button className="mm-source-heading" aria-pressed={i===head} onClick={()=>onHead(i)}>Head {i+1}</button><MatrixGlyph symbol={`Z${i+1}`} data={a.Z} head={i} query={query} compact/><ArrowDown size={23}/></div>)}</div>
    <div className="mm-concat-expression"><code>Concat(Z₁, …, Zₕ)</code><span>沿 feature 维拼接</span></div>
    <div className="mm-concat-target" style={{maxWidth:`${d*36+106}px`}} key={h}><MatrixGlyph symbol="Concat" data={attn.concat} labels={tokens} query={query} columnsByHead={dk} activeHead={head} filledHeads={joined} onHead={onHead}/></div>
    <div className="mm-concat-controls"><button className="primary" onClick={()=>{setJoined(0);setRunning(true);}} disabled={running}><Play size={15}/>演示拼接</button><button className="secondary" disabled={running||joined>=h} onClick={()=>setJoined(n=>n+1)}>拼入下一个头<ArrowRight size={15}/></button><button className="text-button" onClick={()=>{setRunning(false);setJoined(0);}}><RotateCcw size={15}/>重置拼接</button><span aria-live="polite">已拼入 {joined} / {h} 个头</span></div>
  </div>;
}

export function MultiHeadLab({x,attention:attn,tokens,query,head,onHead,four,onFour,initialPhase=0}: {
  x:Matrix;attention:Attention;tokens:string[];query:number;head:number;onHead:(i:number)=>void;four:boolean;onFour:(v:boolean)=>void;initialPhase?:number;
}) {
  const [phase,setPhase]=useState(initialPhase),d=x[0].length,h=attn.heads.length,dk=d/h,q=Math.min(query,tokens.length-1),hi=Math.min(head,h-1),a=attn.heads[hi];
  const marker=useId().replace(/:/g,'');
  const choosePhase=(next:number)=>{setPhase(next);requestAnimationFrame(()=>document.getElementById('study-content')?.scrollIntoView({block:'start',behavior:'instant'}));};
  const headTabs=<div className="mm-head-tabs" aria-label="选择计算头">{attn.heads.map((_,i)=><button key={i} style={tone(i)} aria-pressed={hi===i} onClick={()=>onHead(i)}>Head {i+1}</button>)}</div>;
  const glyph=(symbol:string,data:Matrix,labels?:string[])=> <MatrixGlyph symbol={symbol} data={data} head={hi} query={labels?q:-1} labels={labels}/>;
  return <section className="multihead-lab matrix-mode" aria-label="多头注意力矩阵实验">
    <div className="mm-settings"><div className="mm-config"><button aria-pressed={!four} onClick={()=>onFour(false)}>2 头 · 4 维</button><button aria-pressed={four} onClick={()=>onFour(true)}>4 头 · 8 维</button></div><code>L = {tokens.length} · D = {d} · dₖ = {dk}</code></div>
    <nav className="mm-phases" aria-label="多头矩阵流程">{phases.map((label,i)=><button key={i} aria-current={phase===i?'step':undefined} onClick={()=>choosePhase(i)}><span>{i+1}</span>{label}{i<3&&<ArrowRight size={15}/>}</button>)}</nav>
    <div className="mm-stage">
      {phase===0&&<>
        <div className="mm-caption"><strong>同一个完整 X，分别乘各头的 Wq / Wk / Wv</strong><span>每个头使用自己的投影矩阵：[{tokens.length}, {d}] × [{d}, {dk}] → [{tokens.length}, {dk}]。</span></div>
        {headTabs}
        <div className="mm-projection-flow" style={tone(hi)}><div className="mm-shared-input"><MatrixGlyph symbol="X" data={x} query={q} labels={tokens} mixed/><span>完整 {d} 列</span></div><div className="mm-projection-lanes">{(['Q','K','V'] as const).map(s=><div className="mm-projection-lane" key={s}><Operator>×</Operator>{glyph(`W${s.toLowerCase()}${hi+1}`,a[`W${s.toLowerCase()}` as 'Wq'|'Wk'|'Wv'])}<Operator>=</Operator>{glyph(`${s}${hi+1}`,a[s],tokens)}</div>)}</div></div>
        <div className="mm-summary"><code>D → dₖ</code><span>投影缩小特征维；词的数量 L 保持不变。切换 Head 查看独立的投影组。</span></div>
      </>}
      {phase===1&&<>
        {headTabs}
        <div className="mm-attention-flow" style={tone(hi)}><div className="mm-equation-label">匹配矩阵</div><div className="mm-equation">{glyph(`Q${hi+1}`,a.Q,tokens)}<Operator>×</Operator>{glyph(`K${hi+1}ᵀ`,transpose(a.K))}<Operator>=</Operator>{glyph(`S${hi+1}`,a.scores,tokens)}</div><div className="mm-transform"><svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-label="分数矩阵 S 经缩放和 softmax 转为注意力矩阵 A"><defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10" fill="none" stroke="currentColor" strokeWidth="1.5"/></marker></defs><path d="M835 0V40H165V74" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" markerEnd={`url(#${marker})`}/></svg><code>÷ √dₖ → 按行 softmax</code></div><div className="mm-equation-label">用注意力矩阵混合 Value</div><div className="mm-equation">{glyph(`A${hi+1}`,a.A,tokens)}<Operator>×</Operator>{glyph(`V${hi+1}`,a.V,tokens)}<Operator>=</Operator>{glyph(`Z${hi+1}`,a.Z,tokens)}</div></div>
        <div className="mm-summary"><code>[L,L] × [L,dₖ] → [L,dₖ]</code><span>A 的行是 Query，列是 Key。每个头独立完成这组矩阵运算。</span></div>
      </>}
      {phase===2&&<ConcatBoard attn={attn} tokens={tokens} query={q} head={hi} onHead={onHead}/>}
      {phase===3&&<>
        <div className="mm-caption"><strong>拼接矩阵 × Wₒ → Multi-Head 输出</strong><span>Wₒ 的行按 Head 分组，读取 Concat 的对应列，再混合为新的 D 维特征。</span></div>
        {headTabs}
        <div className="mm-equation mm-output-equation"><MatrixGlyph symbol="Concat" data={attn.concat} labels={tokens} query={q} columnsByHead={dk} activeHead={hi} onHead={onHead}/><Operator>×</Operator><MatrixGlyph symbol="Wₒ" data={attn.Wo} rowsByHead={dk} activeHead={hi}/><Operator>=</Operator><MatrixGlyph symbol="Y" data={attn.out} labels={tokens} query={q} mixed/></div>
        <div className="mm-dimension-equation"><code>[L, D]</code><span>×</span><code>[D, D]</code><span>=</span><code>[L, D]</code></div>
        <div className="mm-summary"><span style={tone(hi)} className="mm-swatch"/><span>当前颜色：Head {hi+1} 的 Concat 列，对应 Wₒ 的行。输出仍然为每个词保留一行。</span></div>
      </>}
    </div>
    <div className="mm-bottom"><button className="secondary" disabled={phase===0} onClick={()=>choosePhase(phase-1)}><ChevronLeft size={16}/>上一环节</button><span>{phase+1} / 4</span><button className="primary" disabled={phase===3} onClick={()=>choosePhase(phase+1)}>下一环节<ChevronRight size={16}/></button></div>
  </section>;
}
