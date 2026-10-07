import {useState,useEffect} from 'react';
import {Tensor,MatrixGrid,Vector} from './Tensors';
import {dot,fmt,vector,type Mode,type computeAttention} from '../lib/math';
import type {TensorName} from '../lib/content';
type Data=ReturnType<typeof computeAttention>;
export default function AttentionStage({step,mode,data,selected,onSelect,onInspect,shape}: {step:number;mode:Mode;data:Data;selected:number;onSelect:(i:number)=>void;onInspect:(n:TensorName)=>void;shape:(n:TensorName)=>string}) {
 const [col,setCol]=useState(0);const key=Math.min(col,data.tokens.length-1);
 const isSoft=step===8,isScale=step===7;
 const values=isSoft?data.weights:isScale?data.scaled:data.raw;
 const name=isSoft?'weights':isScale?'scaled':'score';
 const [calcProgress,setCalcProgress]=useState(0),[calcPlaying,setCalcPlaying]=useState(false);
 useEffect(()=>{setCalcProgress(0);setCalcPlaying(false)},[step,selected,key,data]);
 useEffect(()=>{if(!calcPlaying)return;const timer=setInterval(()=>setCalcProgress(p=>{if(p>=data.q[0].length){setCalcPlaying(false);return p}return p+1}),550);return()=>clearInterval(timer)},[calcPlaying,data.q]);
 const partialDot=data.q[selected].slice(0,calcProgress).reduce((s,x,j)=>s+x*data.k[key][j],0);
 const expSum=data.scaled[selected].reduce((s,x)=>s+Math.exp(x),0);
 const visibleCols=data.tokens.length<=12?data.tokens.map((_,i)=>i):Array.from({length:Math.min(10,data.tokens.length)},(_,i)=>i);
 const kShape=JSON.parse(shape('K')) as number[];
 [kShape[kShape.length-2],kShape[kShape.length-1]]=[kShape[kShape.length-1],kShape[kShape.length-2]];
 const rows=mode==='teaching'?[0,1,2,3]:Array.from(new Set([0,1,2,selected,1023]));
 const top=data.weights[selected].map((w,i)=>({w,i})).sort((a,b)=>b.w-a.w).slice(0,2);
 return <div className="stage-content"><div className="tensor-equation">{isSoft?<><Tensor name="scaled" shape={shape('scaled')} onSelect={onInspect}/><b>→ softmax(Key 轴) →</b></>:<><Tensor name="Q" shape={shape('Q')} onSelect={onInspect}/><b>×</b><Tensor name="K" label="Kᵀ" shape={`[${kShape.join(', ')}]`} onSelect={onInspect}/><b>{isScale?'÷ √d =':'='}</b></>}<Tensor name={name} shape={shape(name)} onSelect={onInspect}/></div><div className="heatmap-title"><span>IMAGE TOKENS ↓ <small>TEXT / CONTEXT TOKENS →</small></span><span className="heat-legend">低 <i/> 高</span></div>
 <MatrixGrid values={rows.map(i=>visibleCols.map(j=>values[i][j]))} rowLabels={rows.map(i=>`#${i}`)} colLabels={visibleCols.map(j=>data.tokens[j])} selectedRow={rows.indexOf(selected)} onRowSelect={i=>onSelect(rows[i])} onCellSelect={(_,c)=>setCol(visibleCols[c])} positive={isSoft}/>
 {mode==='sd'&&<div className="sample-note">工程矩阵共 {data.x.length} × {data.tokens.length}，上表只展示部分行列。完整 mock 的所有列均参与 Softmax；其数值维度为 4。</div>}
 <div className="attention-detail"><div><div className="micro-label">IMAGE TOKEN #{selected} · 一整行的分配</div><div className="attention-bars">{visibleCols.map(j=><button className={key===j?'active':''} key={j} onClick={()=>setCol(j)}><span>{data.tokens[j]}</span><div><i style={{width:`${Math.max(1,data.weights[selected][j]*100)}%`}}/></div><code>{isSoft?(data.weights[selected][j]*100).toFixed(1)+'%':fmt(values[selected][j])}</code></button>)}</div>{isSoft&&<div className="sum-chip">Σ 权重 = <b>{data.weights[selected].reduce((a,b)=>a+b,0).toFixed(6)}</b></div>}</div><div className="calculation-card"><div className="micro-label">{isSoft?'EXP → NORMALIZE':isScale?'SCALE A DOT PRODUCT':'展开一个矩阵单元格'}</div>{!isSoft?<><span className="calc-label">q<sub>{selected}</sub> · k<sub>{key}</sub>（{data.tokens[key]}）</span><Vector values={data.q[selected]}/><Vector values={data.k[key]} color="#bc9bff"/><code>{data.q[selected].map((v,j)=>`${fmt(v,2)}×${fmt(data.k[key][j],2)}`).join(' + ')} = {fmt(dot(data.q[selected],data.k[key]))}</code><button className="dot-product-play" onClick={()=>{setCalcProgress(0);setCalcPlaying(true)}}>▶ 动画计算这个点积</button><div className="dot-product-dims">{data.q[selected].map((x,j)=><span key={j} className={j<calcProgress?'done':''}><small>d{j}</small>{fmt(x*data.k[key][j])}</span>)}</div><div className="dot-accumulator">已累计 {calcProgress}/{data.q[0].length} 维 <b>{fmt(partialDot)}</b></div>{isScale&&<strong>{fmt(data.raw[selected][key])} ÷ √{data.q[0].length} = {fmt(data.scaled[selected][key])}</strong>}</>:<><span className="calc-label">{data.tokens[key]}</span><code>exp({fmt(data.scaled[selected][key])}) = {fmt(Math.exp(data.scaled[selected][key]))}</code><code>Σ exp(L) = {fmt(expSum)}</code><code>{fmt(Math.exp(data.scaled[selected][key]))} / {fmt(expSum)} = {fmt(data.weights[selected][key])}</code><strong>{(data.weights[selected][key]*100).toFixed(2)}%</strong><p>当前这一个图像位置最关注 <b>{data.tokens[top[0].i]}</b>（{(top[0].w*100).toFixed(1)}%）与 <b>{data.tokens[top[1].i]}</b>（{(top[1].w*100).toFixed(1)}%）。</p></>}</div></div><details className="math-details"><summary>为什么不能直接把文本 C 加到图像 X 上？</summary><p>X 的 token 是空间位置，C 的 token 是文本位置，数量、维度、排列都不同，不能直接逐元素相加。即使先投影并广播，也无法让每个图像位置选择不同的词。Attention 计算 N_image × N_text 的匹配，再读取 V，得到与 X 空间长度一致的更新。后面相加的是同尺寸的更新 Y，不是原始 C。</p><code>QKᵀ：选谁　·　A V：取什么　·　x + Δx：融合到图像</code></details></div>;
}

