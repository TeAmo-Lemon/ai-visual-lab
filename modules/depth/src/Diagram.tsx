import {useState} from 'react';
import {Maximize,Minus,Plus} from 'lucide-react';
import type {Tensor,Model} from './model';
type Node={id:string;x:number;y:number;w?:number;title?:string;note?:string};
export function Diagram({data,m,selected,onSelect,playing,stepping,step,onlyDpt=false,trace=false}:{data:Record<string,Tensor>;m:Model;selected:string;onSelect:(s:string)=>void;playing:boolean;stepping:boolean;step:number;onlyDpt?:boolean;trace?:boolean}){
 const [zoom,setZoom]=useState(1);
 const xs=[32,252,472,692];const nodes:Node[]=[];const edges:{d:string;delay:number;target:string}[]=[];
 const node=(id:string,x:number,y:number,title?:string,w=194)=>nodes.push({id,x,y,title,w});
 const edge=(d:string,delay:number,target:string)=>edges.push({d,delay,target});
 const vertical=(x:number,y1:number,y2:number,delay:number,target:string)=>edge(`M${x},${y1} V${y2}`,delay,target);
 if(!onlyDpt){
  ['input','prep','patch','tokens','encoder'].forEach((id,i)=>{node(id,362,24+i*83,id==='encoder'?`${m.blocks} DINOv2 blocks`:undefined,200);if(i)vertical(462,24+(i-1)*83+56,24+i*83,i*0.6,id)});
  xs.forEach((x,i)=>edge(`M462,412 V438 H${x+97} V463`,3+i*.1,`f${i+1}`));
 }
 xs.forEach((x,i)=>{
  const j=i+1;
  node(`f${j}`,x,463,`F${j} · block ${m.layers[i]}`);
  [`reshape${j}`,`project${j}`,`resize${j}`,`scratch${j}`].forEach((id,k)=>{const yy=550+k*83;node(id,x,yy,`${['Reshape','1×1 Conv','×4  ↑|×2  ↑|Identity|÷2  ↓'.split('|')[i],'3×3 · Align'][k]}`);vertical(x+97,yy-87+56,yy,4.2+k*.7,id)});
 });
 for(let i=4;i>=1;i--){const y=911+(4-i)*87;node(`fusion${i}`,692,y,`Fusion ${i} · Refine + Up`);if(i===4)vertical(789,855,911,7.2,'fusion4');else{
  vertical(789,y-87+56,y,8.0+(4-i)*.7,`fusion${i}`);
  const x=xs[i-1]+97;edge(`M${x},855 V${y+28} H692`,7.3,`fusion${i}`);
 }}
 node('head',692,1275,'Depth Prediction Head');vertical(789,1228,1275,10.8,'head');
 node('output',692,1362,'Bilinear → Original');vertical(789,1331,1362,11.5,'output');
 node('depth',692,1449,'Depth Map');vertical(789,1418,1449,12.2,'depth');
 const top=onlyDpt?425:0;
 return <div className="diagram-frame"><div className="diagram-toolbar"><span><i className="tiny-dot"/> {onlyDpt?'DPT · 四条并行分支':'完整 Forward Architecture'} <small>点击模块继续探索</small></span><div className="icon-group"><button aria-label="缩小架构图" onClick={()=>setZoom(Math.max(.7,zoom-.15))}><Minus size={15}/></button><button aria-label="重置架构图缩放" onClick={()=>setZoom(1)}><Maximize size={15}/></button><button aria-label="放大架构图" onClick={()=>setZoom(Math.min(1.8,zoom+.15))}><Plus size={15}/></button></div></div><div className="diagram-scroll"><svg className="architecture-svg" viewBox={`0 ${top} 920 ${1520-top}`} style={{width:`${zoom*100}%`,minWidth:600}} role="img" aria-label="Depth Anything 完整可交互数据流">
 <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#a9a79a"/></marker><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".6" fill="#dedbd2"/></pattern></defs>
 <rect x="0" y={top} width="920" height={1520-top} fill="url(#dots)"/>
 {!onlyDpt&&<><text x="40" y="55" className="zone-label">01 / IMAGE → TOKENS</text><text x="40" y="371" className="zone-label">02 / VISUAL ENCODER</text><text x="40" y="396" className="graph-caption">含 CLS · N + 1 tokens</text></>}
 <rect x="14" y="440" width="896" height="438" rx="16" fill="#f1ede3" fillOpacity=".5" stroke="#dfd9ce" strokeDasharray="5 5"/>
 <text x="32" y="434" className="zone-label">03 / DPT REASSEMBLE · TOKEN → PYRAMID</text>
 <text x="32" y="930" className="zone-label">04 / COARSE → FINE FUSION</text><text x="32" y="954" className="graph-caption">从 F4 起步；F3 → F2 → F1 作为 skip</text>
 <text x="32" y="1293" className="zone-label">05 / DENSE PREDICTION</text><text x="32" y="1318" className="graph-caption">Head 内部先插值，再输出 1 channel</text>
 {edges.map((e,i)=><g key={i} opacity={stepping&&data[e.target]?.step!==step?0.35:1}><path d={e.d} fill="none" stroke={trace?'#af7760':'#aaa99b'} strokeWidth={trace?2.3:1.5} markerEnd="url(#arrow)"/></g>)}
 {nodes.map(n=>{const t=data[n.id];const active=n.id===selected;return <g key={n.id} data-node={n.id} className="graph-node" role="button" tabIndex={0} aria-label={`${n.title??t.name} ${t.shape.join('×')}`} onClick={()=>onSelect(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(n.id)}}} opacity={stepping&&t.step!==step?0.35:1}><rect x={n.x} y={n.y} width={n.w} height="56" rx="10" fill={t.color} stroke={active?'#625b40':'#cbc7b9'} strokeWidth={active?2.4:1}/><text x={n.x+13} y={n.y+22} className="node-title">{n.title??t.name}</text><text x={n.x+13} y={n.y+42} className="node-shape">[{t.shape.join(',')}]</text><text x={n.x+(n.w??194)-17} y={n.y+22} className="node-arrow">↗</text></g>})}
 {playing&&xs.map((x,i)=>{const fusionY=911+(3-i)*87+28;const path=`${onlyDpt?`M${x+97},490`:`M462,52 V412 V438 H${x+97} V490`} V827 V${i===3?fusionY:fusionY} ${i<3?'H789':''} V1477`;return <circle key={i} r="5" fill={['#c08451','#9c8452','#8f749e','#6e8d64'][i]} stroke="#fff9ed" strokeWidth="1.5"><animateMotion dur="12s" repeatCount="indefinite" path={path}/></circle>})}
 <text x="44" y="1475" className="graph-caption">参数遵循官方代码 · 所有数值可在右侧追踪</text>
 </svg></div></div>
}
