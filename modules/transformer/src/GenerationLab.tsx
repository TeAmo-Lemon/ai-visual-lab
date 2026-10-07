import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Check,ChevronLeft,Pause,Play,RotateCcw,Undo2} from 'lucide-react';
import {VOCAB,tokenize, type Matrix, type runModel} from './engine';
import './generation.css';

type Decoder=ReturnType<typeof runModel>['decoder'];
export type GenerationRound={prefix:string[];token:string;p:number;decoder:Decoder;source:string[];gpt:boolean;mask:boolean};
type Props={decoder:Decoder;prefix:string[];history:GenerationRound[];source:string[];gpt:boolean;mask:boolean;initialPhase?:number;onAppend:(token:string,p:number)=>void;onReset:(prefix:string[])=>void;onUndo:()=>void};
const phases=['读已知前缀','取最后一行','选择下一词','追加并循环'];
const phaseTitles=['模型读到的是已有的词','最后一个位置 → 整个词表','从这 8 个词中选 1 个','新词接到前缀末尾'];
function Cells({values}: {values:number[]}){
 return <div className="gen-cells" style={{'--columns':values.length} as CSSProperties}>{values.map((v,i)=><i key={i} style={{background:v>=0?`rgba(104,133,65,${.2+Math.min(Math.abs(v)/2,1)*.65})`:`rgba(181,111,70,${.2+Math.min(Math.abs(v)/2,1)*.65})`}}/>)}</div>;
}
function TokenLine({tokens,newIndex,unknown=false}: {tokens:string[];newIndex?:number;unknown?:boolean}){
 return <div className="gen-token-line">{tokens.map((t,i)=><div className={`gen-token ${i===newIndex?'gen-new':''} ${t==='<BOS>'?'gen-bos':''}`} key={i}><b>{t}</b><small>位置 {i}</small></div>)}{unknown&&<div className="gen-token gen-unknown"><b>?</b><small>下一词</small></div>}</div>;
}
function OutputRows({data,tokens,focus,onFocus}: {data:Matrix;tokens:string[];focus:number;onFocus?:(row:number)=>void}){
 return <div className="gen-output-rows">{data.map((r,i)=><button type="button" className={i===focus?'gen-row active':'gen-row'} key={i} disabled={!onFocus} onClick={()=>onFocus?.(i)} aria-label={`查看位置 ${i} ${tokens[i]} 的输出`} aria-pressed={i===focus}><span><small>{i}</small><b>{tokens[i]}</b></span><Cells values={r}/><span className="gen-row-target">→ {i===tokens.length-1?'下一词 ?':tokens[i+1]}</span></button>)}</div>;
}
export function GenerationLab({decoder,prefix,history,source,gpt,mask,initialPhase=0,onAppend,onReset,onUndo}:Props){
 const [phase,setPhase]=useState(initialPhase),[review,setReview]=useState<number|null>(null),[selected,setSelected]=useState(()=>decoder.probs.at(-1)!.indexOf(Math.max(...decoder.probs.at(-1)!))),[running,setRunning]=useState(false),[focus,setFocus]=useState(prefix.length),[draft,setDraft]=useState(prefix.join(' '));
 const previousDecoder=useRef(decoder),labRef=useRef<HTMLElement>(null);
 const saved=review===null?undefined:history[review],shown=saved?.decoder??decoder,known=saved?.prefix??prefix,tokens=['<BOS>',...known],last=tokens.length-1,d=shown.out[0].length,probs=shown.probs.at(-1)!,best=probs.indexOf(Math.max(...probs)),token=VOCAB[selected],isReview=!!saved,finished=prefix.at(-1)==='<EOS>'||prefix.length>=10,shownMask=saved?.mask??mask;
 useEffect(()=>{if(previousDecoder.current===decoder)return;previousDecoder.current=decoder;setSelected(decoder.probs.at(-1)!.indexOf(Math.max(...decoder.probs.at(-1)!)));setFocus(prefix.length);setPhase(0);setReview(null);setRunning(false);setDraft(prefix.join(' '));},[decoder,prefix]);
 useEffect(()=>{if(!running)return;if(phase===3){setRunning(false);return;}const id=window.setTimeout(()=>setPhase(p=>p+1),1900);return()=>clearTimeout(id);},[running,phase]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>labRef.current?.scrollIntoView({block:'start',behavior:'instant'}));return()=>cancelAnimationFrame(frame);},[phase,review,known.length]);
 const changePhase=(p:number)=>{setRunning(false);setPhase(p);};
 const replay=(index:number)=>{const r=history[index];setReview(index);setSelected(VOCAB.indexOf(r.token));setFocus(r.prefix.length);setPhase(0);setRunning(false);};
 const returnCurrent=()=>{setReview(null);setSelected(bestFor(decoder));setFocus(prefix.length);setPhase(0);setRunning(false);};
 const restart=(next:string[])=>{setReview(null);setPhase(0);setRunning(false);onReset(next);};
 const commit=()=>{if(isReview||finished)return;setRunning(false);onAppend(token,probs[selected]);};
 const activeFocus=Math.min(focus,last);
 return <section className="generation-lab" aria-label="逐词生成实验" ref={labRef}>
  <div className="gen-round-header"><div><strong>{isReview?`回看第 ${review!+1} 轮`:finished?'生成结束':`第 ${history.length+1} 轮`}</strong><span>{isReview?'保留当轮的计算结果':`${history.length} 个新 token 已追加`}</span></div><div className="gen-tools">{isReview?<button className="secondary" onClick={returnCurrent}>返回当前轮</button>:<button className="secondary" disabled={finished} onClick={()=>{if(running){setRunning(false);return;}setPhase(0);setRunning(true);}}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'暂停演示':'演示本轮'}</button>}<button className="secondary" aria-label="重置生成" onClick={()=>restart(['I','love'])}><RotateCcw size={15}/> 重置</button></div></div>
  {isReview&&<p className="gen-review-note">回放当时的前缀与模型输出；本轮选中 <b>{saved.token}</b>（{(saved.p*100).toFixed(1)}%）。</p>}
  {!isReview&&finished?<div className="gen-finished"><Check size={28}/><h3>{prefix.at(-1)==='<EOS>'?'读到 <EOS>，停止生成':'已完成 10 个 token 的教学上限'}</h3><TokenLine tokens={['<BOS>',...prefix]} newIndex={prefix.length}/><p>{prefix.at(-1)==='<EOS>'?'<EOS> 是结束标记，不再进入下一轮。':'可以撤回最后一词，或重置前缀继续实验。'}</p></div>:<>
   <nav className="gen-phases" aria-label="本轮生成步骤">{phases.map((label,i)=><button key={label} className={phase===i?'active':phase>i?'complete':''} aria-current={phase===i?'step':undefined} onClick={()=>changePhase(i)}><span>{i+1}</span>{label}</button>)}</nav>
   <div className="gen-stage" key={`${phase}-${review??'current'}-${tokens.length}`}>
    <div className="gen-stage-heading"><span>{phase+1} / 4</span><h3>{phaseTitles[phase]}</h3></div>
    {phase===0&&<>
     <div className="gen-prefix-panel"><div className="gen-panel-label"><strong>本轮输入 · {tokens.length} 个位置</strong><span>问号还没有进入模型</span></div><TokenLine tokens={tokens} unknown/></div>
     <div className="gen-decoder-link"><ArrowRight/><b>Decoder</b><span>{(saved?.gpt??gpt)?'因果自注意力 → FFN':'因果自注意力 → 读取 Encoder → FFN'}</span></div>
     <div className="gen-output-panel"><div className="gen-panel-label"><strong>输出 H · 每个输入位置一行</strong><code>[{tokens.length}, {d}]</code></div><div className="gen-row-labels"><span>输入位置</span><span>特征向量</span><span>要预测的位置</span></div><OutputRows data={shown.out} tokens={tokens} focus={activeFocus} onFocus={setFocus}/><p className="gen-row-explain">{activeFocus===last?<><b>最后一行 {tokens[last]}</b> 已读到整个已知前缀，用它预测问号处的下一词。</>:<>位置 {activeFocus} 的 <b>{tokens[activeFocus]}</b> {shownMask?`只能读到位置 0…${activeFocus}`:'当前 Mask 关闭，可看所有已知位置'}，它对应的预测位置是 <b>{tokens[activeFocus+1]}</b>，这个词已经在前缀里了。</>}</p></div>
    </>}
    {phase===1&&<>
     <div className="gen-extract"><div><div className="gen-panel-label"><strong>Decoder 输出 H</strong><code>[{tokens.length}, {d}]</code></div><OutputRows data={shown.out} tokens={tokens} focus={last}/></div><ArrowRight className="gen-extract-arrow"/><div className="gen-last-vector"><strong>只取最后一行</strong><b>h_last · {tokens[last]}</b><Cells values={shown.out.at(-1)!}/><code>[1, {d}]</code></div></div>
     <div className="gen-projection"><div className="gen-projection-title">把这一行投影到词表</div><div className="gen-matrix-operation"><div className="gen-matrix-factor"><b>h_last</b><Cells values={shown.out.at(-1)!}/><code>[1, <em>{d}</em>]</code></div><span className="gen-operator">×</span><div className="gen-matrix-factor gen-weights"><b>W_vocab</b><div className="gen-weight-rows">{shown.Wout.map((row,i)=><Cells values={row} key={i}/>)}</div><code>[<em>{d}</em>, {VOCAB.length}]</code></div><span className="gen-operator">=</span><div className="gen-matrix-factor"><b>词表分数 logits</b><Cells values={shown.logits.at(-1)!}/><code>[1, {VOCAB.length}]</code></div></div><p>{d} 维特征变成 {VOCAB.length} 个词表分数。<b>8 是词表大小，不是一次生成 8 个词。</b></p><div className="gen-cell-legend">每个色块代表一个矩阵元素 · 绿色为正，棕色为负</div></div>
    </>}
    {phase===2&&<>
     <div className="gen-softmax"><b>{tokens[last]} 的最后一行分数</b><ArrowRight/><strong>Softmax</strong><ArrowRight/><b>下一词的概率</b></div>
     <div className="gen-choice-heading"><span>{isReview?'本轮保存的候选词分布':'点击候选词，只改变选择'}</span>{!isReview&&<button className="text-button" onClick={()=>setSelected(best)}>选最高概率：{VOCAB[best]}</button>}</div>
     <div className="gen-candidates">{VOCAB.map((t,i)=><button key={t} disabled={isReview} className={selected===i?'selected':''} aria-pressed={selected===i} onClick={()=>setSelected(i)}><div><b>{t}</b><span>{i===best&&<small>最高</small>}{(probs[i]*100).toFixed(1)}%</span></div><div className="gen-prob-track"><i style={{width:`${probs[i]*100}%`}}/></div>{selected===i&&<Check className="gen-selected-check" size={17}/>}</button>)}</div>
     <div className="gen-selection"><span>已选 <b>{token}</b> · {(probs[selected]*100).toFixed(1)}%</span><span>{isReview?'当时的选择':'还没有追加到前缀'}</span></div>
    </>}
    {phase===3&&<>
     <div className="gen-append-preview"><div><strong>追加前 · {tokens.length} 个位置</strong><TokenLine tokens={tokens}/></div><div className="gen-append-bridge"><ArrowRight/><span>只追加 <b>{token}</b></span></div><div className="gen-after"><strong>{token==='<EOS>'?'追加结束标记':`下一轮的输入 · ${tokens.length+1} 个位置`}</strong><TokenLine tokens={[...tokens,token]} newIndex={tokens.length}/></div></div>
     <div className="gen-loop">{token==='<EOS>'?<><Check size={25}/><div><b>遇到 &lt;EOS&gt;，结束。</b><p>它表示序列结束，不再预测后续词。</p></div></>:<><RotateCcw size={26}/><div><b>下一轮重新读取完整前缀</b><p>最后一行将变成 <strong>{token}</strong> 的输出；新的概率也要重新计算。</p></div></>}</div>
     {isReview?<div className="gen-selection"><span>当时已追加 <b>{token}</b></span><button className="text-button" onClick={returnCurrent}>返回当前轮 <ArrowRight size={16}/></button></div>:<button className="primary gen-commit" onClick={commit}>确认追加 {token}{token==='<EOS>'?'，结束生成':'，进入下一轮'} <ArrowRight size={17}/></button>}
    </>}
   </div>
   <div className="gen-phase-controls"><button className="secondary" disabled={phase===0} onClick={()=>changePhase(phase-1)}><ChevronLeft size={16}/> 上一环节</button><span>{phase===0?'每一行对应一个位置':phase===1?'本轮只需要最后一行':phase===2?'选词和追加分成两步':'确认后才更新前缀'}</span>{phase<3?<button className="primary" onClick={()=>changePhase(phase+1)}>{['看最后一行','看词表概率',`看如何追加 ${token}`][phase]} <ArrowRight size={16}/></button>:<button className="secondary" onClick={()=>changePhase(2)}>重新选词</button>}</div>
  </>}
  <div className="gen-bottom"><span>固定未训练权重 · 8 词教学词表</span><button className="text-button" disabled={!history.length} onClick={()=>{setReview(null);onUndo();}}><Undo2 size={15}/> 撤回最后一词</button></div>
  {history.length>0&&<div className="gen-history"><strong>逐轮回看</strong><div>{history.map((r,i)=><button className={review===i?'active':''} key={i} onClick={()=>replay(i)}><small>第 {i+1} 轮</small><b>{r.token}</b><span>{(r.p*100).toFixed(1)}%</span></button>)}</div></div>}
  <details className="gen-prefix-editor"><summary>修改起始前缀</summary><form onSubmit={e=>{e.preventDefault();restart(tokenize(draft));}}><label htmlFor="generation-prefix">已知前缀（&lt;BOS&gt; 自动加入）</label><div><input id="generation-prefix" value={draft} maxLength={160} onChange={e=>setDraft(e.target.value)}/><button className="secondary" type="submit">重新开始</button><button className="secondary" type="button" onClick={()=>restart([])}>从 &lt;BOS&gt; 开始</button></div></form></details>
  {!(saved?.gpt??gpt)&&<div className="gen-source">Encoder 源句：{(saved?.source??source).join(' ')}<span>每轮使用同一份 Encoder 记忆</span></div>}
  {!shownMask&&<p className="gen-mask-warning">当前因果 Mask 已关闭；历史位置也能看后面的已知词。可在 Causal Mask 步骤重新打开。</p>}
 </section>;
}
function bestFor(decoder:Decoder){const p=decoder.probs.at(-1)!;return p.indexOf(Math.max(...p));}
