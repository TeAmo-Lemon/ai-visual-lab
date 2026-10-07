import {useState} from 'react';
import {motion} from 'framer-motion';
import {fmt,type Model,type Tensor,type Config} from './model';
import {PatchLab,ReshapeLab} from './Labs';
import {DepthLab} from './MoreLabs';
import {Scene} from './Scene';
type Data=Record<string,Tensor>;
export const courseTitles=['RGB 输入','尺寸调整与归一化','14×14 切块','Patch Embedding','DINOv2 Blocks','抽取四层特征','Token → 二维网格','1×1 通道投影','多尺度采样与通道对齐','Fusion 4','Fusion 3','Fusion 2','Fusion 1','深度预测 Head','恢复原图尺寸','Depth Map 与坐标追踪'];
export function courseSpec(s:number,m:Model,d:Data){
 const four=(prefix:string)=>[1,2,3,4].map(i=>`${prefix}${i}`);
 const all=[
  {inputs:['input'],outputs:['input'],ops:['按 B、RGB、H₀、W₀ 排列'],explain:'输入是一张 RGB 图片。3 表示三个颜色通道，H₀、W₀ 表示原图尺寸。'},
  {inputs:['input'],outputs:['prep'],ops:[`保留比例 → ${m.h}×${m.w}`, 'RGB / 255', '减 ImageNet mean，再除 std'],explain:'先调整空间尺寸，使高、宽都是 14 的倍数；归一化只改变数值，不改变 shape。'},
  {inputs:['prep'],outputs:['patch'],ops:[`${m.h} / 14 = ${m.ph} 行`,`${m.w} / 14 = ${m.pw} 列`,`${m.ph} × ${m.pw} = ${m.n} 块`],explain:'这里先把切块单独画出来。每块含 14×14×3=588 个数；6 维 shape 是概念展开，官方不会显式创建这个张量。'},
  {inputs:['patch'],outputs:['tokens'],ops:[`Conv2d(3 → ${m.dim}, kernel=14, stride=14)`,`[1, ${m.dim}, ${m.ph}, ${m.pw}]`, 'flatten(2) → transpose(1,2)'],explain:`同一组学习到的投影用于每个 patch：588 个输入数变成 ${m.dim} 个特征数。共有 ${m.n} 个 patch tokens。`},
  {inputs:['tokens'],outputs:['encoder'],ops:[`加入 CLS：N → N+1 = ${m.n+1}`, '加入位置编码',`${m.blocks} 个 Transformer blocks`],explain:`每个 block 都保留 ${m.n+1} 个 tokens、每个 token ${m.dim} 维。Attention 改变特征内容，网格大小保持不变。`},
  {inputs:['encoder'],outputs:four('f'),ops:[`取 blocks [${m.layers.join(', ')}]（0-based）`, 'LayerNorm', '分离 CLS，保留 patch tokens'],explain:'四组特征来自不同深度的 blocks，但 N 和 C 完全相同。此处还没有多尺度空间金字塔。'},
  {inputs:four('f'),outputs:four('reshape'),ops:[`[1, ${m.n}, ${m.dim}]`, `permute(0,2,1) → [1, ${m.dim}, ${m.n}]`, `reshape → [1, ${m.dim}, ${m.ph}, ${m.pw}]`],explain:'四条分支各自做同样的重排。N 按原 patch 网格拆成 Hₚ×Wₚ；特征维 C 成为 feature map 的通道。'},
  {inputs:four('reshape'),outputs:four('project'),ops:['各分支使用独立 1×1 Conv',`C=${m.dim} → Cᵢ=[${m.channels.join(', ')}]`, 'Hₚ、Wₚ 不变'],explain:'1×1 Conv 在每个空间位置组合通道。只改变 C，既不下采样，也不会让四条分支的通道必然相等。'},
  {inputs:four('project'),outputs:four('scratch'),ops:['F1 ×4；F2 ×2；F3 保持；F4 stride 2', '随后 scratch：3×3 Conv', `四条分支的 Cᵢ → D=${m.features}`],explain:'resize_layers 先建立不同空间尺度；scratch 再统一通道。下面分别显示这两次操作的输入与输出。'},
  ...[4,3,2,1].map(i=>({inputs:i===4?['scratch4']:[`fusion${i+1}`,`scratch${i}`],outputs:[`fusion${i}`],ops:i===4?['RCU2（无 skip 加法）',`Bilinear → ${d.fusion4.shape.slice(2).join('×')}`, '1×1 Conv，D 不变']:['skip → RCU1 → 与上一 Fusion 输出相加','RCU2',`Bilinear → ${d[`fusion${i}`].shape.slice(2).join('×')}`, '1×1 Conv，D 不变'],explain:i===4?'从最深的 F4 分支开始。Fusion 4 只有一个输入，输出显式插值到 F3 的网格尺寸。':`Fusion ${i} 的两个输入已经同尺寸、同通道。先相加并细化，再扩大到下一网格；不是扩大之后再做当前层加法。`})),
  {inputs:['fusion1'],outputs:['prediction'],ops:[`3×3 Conv：${m.features} → ${m.features/2}`,`Bilinear → ${m.h}×${m.w}`, `3×3 Conv：${m.features/2} → 32，ReLU`, '1×1 Conv：32 → 1，ReLU'],explain:'Head 先减少通道，再恢复模型输入分辨率，最后预测一个标量通道。每个位置的值由深度监督学来。'},
  {inputs:['prediction'],outputs:['output'],ops:['forward：squeeze(1) → [B,H,W]', '单图推理时加回 channel 维',`Bilinear → 原图 ${m.rawH}×${m.rawW}`],explain:'Head 内部插值恢复的是预处理尺寸；这里恢复原始照片尺寸。两个插值步骤发生在不同位置。'},
  {inputs:['output'],outputs:['depth'],ops:['取出 batch 和单通道维', '每个原图像素对应一个标量'],explain:'基础模型的输出描述相对远近，不能直接读成米。下面的颜色和数值是模拟演示，可点击像素追踪其空间对应。'}
 ];return all[s];
}
const labels:Record<string,string>={input:'1 · RGB 输入',prep:'2 · Resize + Normalize',patch:'3 · 14×14 Patch Grid（概念）',tokens:'4 · Conv14 → Flatten → Transpose',position:'5 · CLS + Position',encoder:'5 · DINOv2 Transformer Blocks',head:'14 · 3×3 Conv：D → D/2',headUp:'14 · Bilinear → 预处理尺寸',head32:'14 · 3×3 Conv：D/2 → 32 + ReLU',prediction:'14 · 1×1 Conv：32 → 1 + ReLU',squeeze:'15 · forward：squeeze(1)',output:'15 · Bilinear → 原图尺寸',depth:'16 · 单图 Depth Map'};
export function Architecture({config,m,data,selected,onInspect,onLearn}:{config:Config;m:Model;data:Data;selected:string;onInspect:(id:string)=>void;onLearn:(s:number)=>void}){
 const [flow,setFlow]=useState(false);
 const xs=[145,415,685,955];const nodes:{id:string;x:number;y:number;w:number;title:string;note?:string}[]=[];
 ['input','prep','patch','tokens','position','encoder'].forEach((id,i)=>nodes.push({id,x:360,y:i*124,w:400,title:labels[id],note:id==='encoder'?`${m.blocks} blocks；每个 block 维度相同`:undefined}));
 const stages=['f','reshape','project','resize','scratch'];const ys=[792,934,1076,1218,1360];
 for(let j=1;j<=4;j++)for(let r=0;r<5;r++)nodes.push({id:`${stages[r]}${j}`,x:xs[j-1]-123,y:ys[r],w:246,title:[`6 · F${j} ← block ${m.layers[j-1]}`,'7 · Transpose → Reshape',`8 · 1×1：${m.dim} → ${m.channels[j-1]}`,['9 · ConvTranspose ×4','9 · ConvTranspose ×2','9 · Identity','9 · Conv stride 2'][j-1],`9 · scratch：${m.channels[j-1]} → ${m.features}`][r]});
 const fy=[1514,1666,1818,1970];[4,3,2,1].forEach((j,i)=>nodes.push({id:`fusion${j}`,x:832,y:fy[i],w:246,title:`${10+i} · Fusion ${j}`,note:j===4?'仅 F4；RCU2 → 插值 → Conv':`与 F${j} 相加 → RCU2 → 插值`}));
 const tail=['head','headUp','head32','prediction','squeeze','output','depth'];tail.forEach((id,i)=>nodes.push({id,x:730,y:2128+i*124,w:400,title:labels[id]}));
 const paths:{d:string;skip?:number}[]=[];
 for(let i=0;i<5;i++)paths.push({d:`M560 ${i*124+94} V${(i+1)*124}`});
 paths.push({d:'M560 714 V752 H145 V792'},{d:'M560 752 H415 V792'},{d:'M560 752 H685 V792'},{d:'M560 752 H955 V792'});
 for(let j=0;j<4;j++)for(let r=0;r<4;r++)paths.push({d:`M${xs[j]} ${ys[r]+94} V${ys[r+1]}`});
 paths.push({d:'M955 1454 V1514'});
 for(let i=0;i<3;i++)paths.push({d:`M955 ${fy[i]+94} V${fy[i+1]}`});
 [3,2,1].forEach(j=>{const y=fy[4-j]+47;paths.push({d:`M${xs[j-1]} 1454 V${y} H832`,skip:j})});
 paths.push({d:'M955 2064 V2098 H930 V2128'});for(let i=0;i<6;i++)paths.push({d:`M930 ${2128+i*124+94} V${2128+(i+1)*124}`});
 return <><div className="architecture-selection"><span>已选：<b>{data[selected].name}</b></span><code>{fmt(data[selected].shape)}</code><button onClick={()=>setFlow(!flow)}>{flow?'停止数据流':'播放 F4 → Depth 数据流'}</button><button onClick={()=>onLearn(data[selected].step)}>展开第 {data[selected].step+1} 步 →</button></div><div className="architecture-scroll"><div className="architecture-canvas" style={{height:3010}}><svg width="1180" height="3010" className="connections" aria-label="架构模块的真实连接"><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#566344"/></marker></defs>{paths.map((p,i)=><path key={i} d={p.d} fill="none" stroke={p.skip?'#9b691f':'#566344'} strokeWidth={p.skip?3:2.5} markerEnd="url(#flow-arrow)"/>)}</svg>
  {flow&&<svg className="moving-data" width="1180" height="3010" aria-label="沿 F4 分支经过所有融合和 Head 的数据点"><motion.circle r="9" fill="#a06522" stroke="#fffef9" strokeWidth="3" animate={{cx:[560,560,560,560,560,560,560,955,955,955,955,955,955,955,955,955,955,955,955,930,930,930,930,930,930,930,930],cy:[47,171,295,419,543,667,752,752,839,981,1123,1265,1407,1561,1619,1713,1865,2017,2098,2098,2175,2299,2423,2547,2671,2795,2919]}} transition={{duration:30,repeat:Infinity,ease:'linear'}}/></svg>}
  <div className="stage-label" style={{top:20}}>输入与预处理</div><div className="stage-label" style={{top:500}}>DINOv2 Encoder</div><div className="stage-label" style={{top:740}}>DPT：四条并行分支</div>
  <div className="diagram-caption" style={{top:815,left:1100,width:78}}>四组 shape 相同<br/>CLS 已移除</div><div className="diagram-caption" style={{top:1210,left:1100,width:78}}>此处才建立不同空间尺度</div>
  {[3,2,1].map(j=><span key={j} className="skip-label" style={{top:fy[4-j]+16,left:xs[j-1]+20}}>F{j} skip → RCU1 → Add</span>)}
  {nodes.map(n=><button key={n.id} data-node={n.id} className={`arch-node ${selected===n.id?'selected':''}`} style={{left:n.x,top:n.y,width:n.w,background:data[n.id].color}} onClick={()=>onInspect(n.id)} onDoubleClick={()=>onLearn(data[n.id].step)}><strong>{n.title}</strong><code>{fmt(data[n.id].shape)}</code><span>{n.note??data[n.id].format}</span></button>)}
  <div className="diagram-caption" style={{top:2600,left:90,width:540}}><b>两次空间恢复：</b><br/>Head 内部：{m.ph*8}×{m.pw*8} → {m.h}×{m.w}<br/>单图推理：{m.h}×{m.w} → {m.rawH}×{m.rawW}<br/>{config.version==='v2'?'V2 infer_image':'V1 run.py'} 最后取出二维数组。</div>
 </div></div><p className="caption">点击模块查看维度；点击“展开”进入对应步骤。窄屏可横向滚动，图中文字保持原字号。</p></>;
}
function Chain({items,onInspect}:{items:{id?:string;label:string;shape?:number[]}[];onInspect:(id:string)=>void}){return <div className="operation-chain">{items.map((item,i)=><div key={i}>{i>0&&<span className="down-arrow">↓</span>}<button onClick={()=>item.id&&onInspect(item.id)}><b>{item.label}</b>{item.shape&&<code>{fmt(item.shape)}</code>}</button></div>)}</div>}
function Encoder({m,data,onInspect,onAttention}:{m:Model;data:Data;onInspect:(id:string)=>void;onAttention:()=>void}){
 const [block,setBlock]=useState<number|null>(null);
 return <div className="detail-section"><h3>Blocks 与四个抽取位置</h3><p>block 编号从 0 开始。点击任一 block 查看内部操作。</p><div className="block-list">{Array.from({length:m.blocks},(_,i)=><div className="block-item" key={i}><button className={block===i?'active':''} onClick={()=>setBlock(block===i?null:i)}>Block {i}</button>{i<m.blocks-1&&<span>→</span>}{m.layers.includes(i)&&<button className="feature-tap" onClick={()=>onInspect(`f${m.layers.indexOf(i)+1}`)}>↓ F{m.layers.indexOf(i)+1}<code>{fmt(data.f1.shape)}</code></button>}</div>)}</div>
  {block!==null&&<div className="block-inner"><h4>Block {block} · 输入和输出均为 {fmt(data.encoder.shape)}</h4><div className="residual-row"><span>X → LayerNorm</span><button onClick={onAttention}>Self-Attention · 查看 Q/K/V ↗</button><span>LayerScale → Add(X)</span></div><div className="residual-row"><span>Y → LayerNorm</span><span>{m.dim===1536?'SwiGLU FFN':'MLP'} → LayerScale</span><span>Add(Y) → 输出</span></div><p>两个残差连接分别加回 Attention 前、MLP 前的输入；此配置不改变 token 数。</p></div>}
  <div className="feature-cards">{[1,2,3,4].map(i=><button key={i} onClick={()=>onInspect(`f${i}`)}><h4>F{i} · block {m.layers[i-1]}</h4><code>{fmt(data[`f${i}`].shape)}</code><p>N={m.n}，C={m.dim}<br/>网格 {m.ph}×{m.pw}，无 CLS</p></button>)}</div><p>多层抽取提供不同阶段的表示，Decoder 同时利用局部结构与全局关系。浅层偏纹理、深层偏语义是直觉，不能作为通道的固定定义。</p>
 </div>
}
function Fusion({i,m,data,onInspect}:{i:number;m:Model;data:Data;onInspect:(id:string)=>void}){
 const shape=data[`scratch${i}`].shape;
 return <div className="detail-section"><h3>Fusion {i} 内部顺序</h3>{i===4?<p>输入只有 scratch F4；不执行 skip RCU1 与两个输入的 Add。</p>:<div className="fusion-inputs"><button onClick={()=>onInspect(`fusion${i+1}`)}>上一层 path_{i+1}<code>{fmt(shape)}</code></button><span>＋</span><button onClick={()=>onInspect(`scratch${i}`)}>scratch F{i} → RCU1<code>{fmt(shape)}</code></button></div>}
 <Chain onInspect={onInspect} items={[{label:i===4?'单输入进入 RCU2':'Add：逐元素相加',shape},{label:'RCU2：两个 3×3 Conv + 残差',shape},{label:`Bilinear：显式指定 ${data[`fusion${i}`].shape.slice(2).join('×')}`,shape:data[`fusion${i}`].shape},{id:`fusion${i}`,label:'1×1 out_conv：D → D',shape:data[`fusion${i}`].shape}]}/>
 <details className="rcu-detail"><summary>展开 RCU：ReLU → Conv → ReLU → Conv → Add</summary><Chain onInspect={onInspect} items={['输入 X','ReLU','3×3 Conv，padding=1','ReLU','3×3 Conv，padding=1','与原输入 X 相加'].map(label=>({label,shape}))}/><p>通道 D={m.features}、高宽都保持不变。默认 use_bn=False。</p></details>
 </div>
}
export function CourseDetail({step,m,config,data,image,patch,onPatch,onInspect,onAttention,onTrace,onOverview}:{step:number;m:Model;config:Config;data:Data;image?:string;patch:number;onPatch:(n:number)=>void;onInspect:(id:string)=>void;onAttention:()=>void;onTrace:()=>void;onOverview:()=>void}){
 if(step===0||step===1)return <div className="detail-section two-column"><div className="sample-image" style={{aspectRatio:`${m.rawW}/${m.rawH}`}}><Scene image={image}/></div><div><h3>{step===0?'输入的四个轴':'预处理前后'}</h3>{step===0?<div className="large-axes"><p>B = 1 张图片</p><p>RGB = 3 个通道</p><p>H₀ = {m.rawH} 行</p><p>W₀ = {m.rawW} 列</p></div>:<><p>原图：{m.rawH}×{m.rawW}</p><p>模型输入：{m.h}×{m.w}</p><p>RGB / 255 后使用 mean=[0.485,0.456,0.406]、std=[0.229,0.224,0.225]。</p><p>{config.mode==='real'?`官方 lower_bound=${config.target}，保持比例，并约束到 14 的倍数。`:'教学例子强制为 56×56。真实预处理请切到“真实模型”。'}</p></>}</div></div>;
 if(step===2||step===3)return <PatchLab m={m} image={image} selected={patch} onSelect={onPatch} onTensor={onInspect} initialStage={step===3?1:0}/>;
 if(step===4||step===5)return <Encoder m={m} data={data} onInspect={onInspect} onAttention={onAttention}/>;
 if(step===6)return <ReshapeLab m={m} selected={patch} onSelect={onPatch} onTensor={onInspect}/>;
 if(step===7)return <div className="detail-section"><h3>逐分支看通道变化</h3><div className="feature-cards">{[1,2,3,4].map(i=><div className="projection-card" key={i}><h4>F{i}</h4><button onClick={()=>onInspect(`reshape${i}`)}><code>{fmt(data[`reshape${i}`].shape)}</code></button><p>↓ 1×1 Conv：{m.dim} → <b>{m.channels[i-1]}</b></p><button onClick={()=>onInspect(`project${i}`)}><code>{fmt(data[`project${i}`].shape)}</code></button><p>空间仍为 {m.ph}×{m.pw}</p></div>)}</div></div>;
 if(step===8)return <ResizeDetail m={m} data={data} onInspect={onInspect}/>;
 if(step>=9&&step<=12)return <Fusion i={13-step} m={m} data={data} onInspect={onInspect}/>;
 if(step===13||step===14)return <div className="detail-section"><h3>{step===13?'Head 的四次操作':'从 Head 输出到单图结果'}</h3><Chain onInspect={onInspect} items={(step===13?['fusion1','head','headUp','head32','prediction']:['prediction','squeeze','output','depth']).map(id=>({id,label:labels[id]??'Fusion 1 的输出',shape:data[id].shape}))}/></div>;
 return <DepthLab m={m} config={config} image={image} selected={patch} onSelect={onPatch} onTrace={onTrace} onNavigate={onOverview} onTensor={onInspect}/>;
}
function ResizeDetail({m,data,onInspect}:{m:Model;data:Data;onInspect:(id:string)=>void}){
 const [resized,setResized]=useState(false);
 return <div className="detail-section"><div className="panel-heading"><h3>先改变 H/W，再统一 C</h3><button className="primary" onClick={()=>setResized(!resized)}>{resized?'重置尺度':'播放多尺度变化'}</button></div><div className="resize-grid">{[1,2,3,4].map(i=><div className="resize-column" key={i}><h4>F{i}</h4><button onClick={()=>onInspect(`project${i}`)}><span>输入：project</span><code>{fmt(data[`project${i}`].shape)}</code></button><p>↓ {['ConvTranspose k=4,s=4','ConvTranspose k=2,s=2','Identity','Conv k=3,s=2,p=1'][i-1]}</p><div className="scale-area"><motion.div className="feature-square" animate={{width:resized?[160,100,70,40][i-1]:70,height:resized?[160,100,70,40][i-1]:70}} transition={{duration:.8}}><div className="square-grid"/></motion.div></div><button onClick={()=>onInspect(`resize${i}`)}><span>resize 输出</span><code>{fmt(data[`resize${i}`].shape)}</code></button><p>↓ scratch · 3×3 Conv<br/>{m.channels[i-1]} → {m.features} 通道</p><button onClick={()=>onInspect(`scratch${i}`)}><span>统一通道后</span><code>{fmt(data[`scratch${i}`].shape)}</code></button></div>)}</div><p className="formula">F4 下采样：floor((Hₚ+2−3)/2+1) = ceil(Hₚ/2)。当前 {m.ph} → {Math.ceil(m.ph/2)}；Fusion 4 再显式插值到 {m.ph}，不直接把 {Math.ceil(m.ph/2)} 乘 2。</p></div>
}


