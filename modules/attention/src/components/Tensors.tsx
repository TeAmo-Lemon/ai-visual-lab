import { COLORS, NAMES, type TensorName } from '../lib/content';
import { fmt, type Matrix } from '../lib/math';
import { useState } from 'react';

export function Tensor({name,shape,onSelect,label}: {name:TensorName;shape:string;onSelect:(n:TensorName)=>void;label?:string}) {
 return <button className="tensor-pill" style={{'--tensor-color':COLORS[name]} as React.CSSProperties} onClick={()=>onSelect(name)} title={`检查 ${NAMES[name]} 的 Shape 与每一维含义`}><b>{label??name}</b><code>{shape}</code><span>↗</span></button>;
}
export function Vector({values,color='#48602f',label}: {values:number[];color?:string;label?:string}) {
 return <div className="vector-wrap">{label&&<span className="micro-label">{label}</span>}<div className="vector" style={{'--tensor-color':color} as React.CSSProperties}>{values.map((x,i)=><span key={i} title={`dimension ${i}: ${x}`}>{fmt(x,2)}</span>)}</div></div>;
}
export function MatrixGrid({values,rowLabels,colLabels,selectedRow=0,onRowSelect,onCellSelect,positive=false,compact=false}: {values:Matrix;rowLabels?:string[];colLabels?:string[];selectedRow?:number;onRowSelect?:(r:number)=>void;onCellSelect?:(r:number,c:number)=>void;positive?:boolean;compact?:boolean}) {
 const [cell,setCell]=useState<[number,number]|null>(null);
 const max=Math.max(.001,...values.flat().map(Math.abs));
 return <div className={`matrix-wrap ${compact?'compact':''}`}><div className="matrix-scroll"><table className="matrix-table"><thead><tr><th></th>{values[0]?.map((_,j)=><th key={j}>{colLabels?.[j]??`d${j}`}</th>)}</tr></thead><tbody>{values.map((row,i)=><tr key={i} className={selectedRow===i?'selected-row':''}><th><button onClick={()=>onRowSelect?.(i)}>{rowLabels?.[i]??`#${i}`}</button></th>{row.map((x,j)=><td key={j}><button className={cell?.[0]===i&&cell?.[1]===j?'active-cell':''} onClick={()=>{setCell([i,j]);onRowSelect?.(i);onCellSelect?.(i,j);}} style={{background:`rgba(${positive?'106, 140, 80':x<0?'151, 115, 171':'120, 150, 87'},${.10+Math.abs(x)/max*.53})`}} title={`row ${i}, col ${j}: ${x}`}>{fmt(x)}</button></td>)}</tr>)}</tbody></table></div>{cell&&values[cell[0]]?.[cell[1]]!==undefined&&<div className="cell-caption">选中 [{rowLabels?.[cell[0]]??cell[0]}, {colLabels?.[cell[1]]??cell[1]}] = <code>{fmt(values[cell[0]][cell[1]],6)}</code></div>}</div>;
}
export function Arrow({label,vertical=false}: {label?:string;vertical?:boolean}) {return <div className={`arrow ${vertical?'vertical':''}`}><span>{label}</span><svg width={vertical?26:78} height={vertical?44:26} viewBox={vertical?'0 0 26 44':'0 0 78 26'} aria-hidden="true"><path d={vertical?'M13 2 V36 l-5 -6 m5 6 l5 -6':'M2 13 H69 l-6 -5 m6 5 l-6 5'} fill="none" stroke="currentColor" strokeWidth="1.5"/><circle r="2.5" className="flow-dot"><animateMotion dur="2s" repeatCount="indefinite" path={vertical?'M13 2 V36':'M2 13 H65'}/></circle></svg></div>;}

