import {imageVector,tokenToSpatial,spatialToToken,type Mode,type Matrix} from '../lib/math';
import {Vector} from './Tensors';
export default function FeatureMap({mode,selected,onSelect,flatten=false,restore=false,values}: {mode:Mode;selected:number;onSelect:(i:number)=>void;flatten?:boolean;restore?:boolean;values?:Matrix}) {
 const size=mode==='teaching'?2:32;
 const {row,col}=tokenToSpatial(selected,size);
 const cell=256/size;
 const feature=(i:number)=>values?.[i]??imageVector(i,mode);
 return <div className={`feature-demo ${flatten?'is-flat':''} ${restore?'is-restore':''}`}>
   <div className="spatial-view"><div className="micro-label">SPATIAL POSITIONS <span>{size} × {size}</span></div>
    <svg className="feature-grid" viewBox="-15 -18 290 298" role="img" aria-label={`${size} 乘 ${size} 的可选择特征网格`}>
     <text x="128" y="-6" textAnchor="middle">W = {size}</text><text x="-10" y="128" transform="rotate(-90 -10 128)" textAnchor="middle">H = {size}</text>
     {Array.from({length:size*size},(_,i)=>{const pos=tokenToSpatial(i,size);const val=feature(i)[0];return <rect key={i} x={pos.col*cell+1} y={pos.row*cell+1} width={cell-2} height={cell-2} rx={mode==='teaching'?7:1} fill={i===selected?'#8ac4ff':`rgba(78,148,216,${.18+(val+1)/3*.52})`} stroke={i===selected?'#e3f0ff':'none'} strokeWidth="1.5" onClick={()=>onSelect(i)}><title>{`row=${pos.row}, col=${pos.col}, token #${i}`}</title></rect>})}
     {mode==='teaching'&&Array.from({length:4},(_,i)=><text key={i} className="grid-token-label" x={(i%2)*cell+cell/2} y={Math.floor(i/2)*cell+cell/2+5} textAnchor="middle" pointerEvents="none">#{i}</text>)}
     <text x="128" y="280" textAnchor="middle">C = {mode==='teaching'?4:320} · 每格一个特征向量</text>
    </svg>
   </div>
   {(flatten||restore)&&<div className="reshape-motion"><svg viewBox="0 0 95 255" aria-label="空间 token 移动到序列的动画"><path d="M0 50 C55 50 32 128 90 128 M0 180 C55 180 32 128 90 128" stroke="#365470" fill="none"/>{[0,1,2,3].map(i=><rect key={i} width="6" height="6" fill="#62a9f6"><animateMotion path={restore?'M90 128 C32 128 55 50 0 50':'M0 50 C55 50 32 128 90 128'} dur="2s" begin={`${i*.4}s`} repeatCount="indefinite"/></rect>)}</svg><span>{restore?'unflatten':'flatten + transpose'}</span></div>}
   {(flatten||restore)&&<div className="token-sequence"><div className="micro-label">{size*size} IMAGE TOKENS</div>{(mode==='teaching'?[0,1,2,3]:[0,1,2,selected,1023]).map((i,j)=><button key={`${i}-${j}`} className={`sequence-token ${i===selected?'active':''}`} onClick={()=>onSelect(i)}><b>#{i}</b><span>{feature(i).map((v,k)=><i key={k} style={{opacity:Math.min(.95,.3+Math.abs(v)/2)}} />)}{mode==='sd'&&<small>… 320d</small>}</span></button>)}{mode==='sd'&&<small>部分 token 示意 · 全部位置一一保留</small>}</div>}
   <div className="position-readout"><span className="micro-label">追踪一个空间位置</span><div className="position-inputs"><label>row<input aria-label="row" type="number" min={0} max={size-1} value={row} onChange={e=>onSelect(spatialToToken(Math.max(0,Math.min(size-1,Number(e.target.value))),col,size))}/></label><label>col<input aria-label="col" type="number" min={0} max={size-1} value={col} onChange={e=>onSelect(spatialToToken(row,Math.max(0,Math.min(size-1,Number(e.target.value))),size))}/></label><strong>→ #{selected}</strong></div><code>{row} × {size} + {col} = {selected}</code><Vector values={feature(selected)} label={mode==='sd'?'4 维数值示意 · 非真实 320 维特征':restore?'该位置的 4 维条件更新 Δx':'该位置完整的 4 维 feature'}/><p>从左到右、逐行展开。坐标与 token 编号均从 0 开始。</p></div>
 </div>;
}

