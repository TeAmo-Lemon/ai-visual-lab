import { Braces, Info, Copy, Check } from 'lucide-react';
import {useState} from 'react';
import {COLORS,NAMES,type TensorName} from '../lib/content';
import type {Mode, AttentionKind} from '../lib/math';
export type CustomTensor={title:string;dims:number[];meanings:string[];description:string};

export function tensorSpec(name:TensorName,mode:Mode,kind:AttentionKind,multi:boolean) {
 const n=mode==='sd'?1024:4,c=mode==='sd'?320:4,m=kind==='self'?n:mode==='sd'?77:3,h=multi?(mode==='sd'?8:2):1,d=c/h;
 const attn=multi?[1,h,n,d]:[1,n,c],ctx=multi?[1,h,m,d]:[1,m,c];
 let dims:number[], meanings:string[];
 if(['feature','restored','residual'].includes(name)){dims=[1,c,mode==='sd'?32:2,mode==='sd'?32:2];meanings=['Batch','Channels','Height','Width'];}
 else if(name==='C'){dims=[1,mode==='sd'?77:3,mode==='sd'?768:4];meanings=['Batch','Text tokens','Context dimension'];}
 else if(['K','V'].includes(name)){dims=ctx;meanings=multi?['Batch','Heads',kind==='self'?'Image tokens':'Text tokens','Head dimension']:['Batch',kind==='self'?'Image tokens':'Text tokens','Projected dimension'];}
 else if(['score','scaled','weights'].includes(name)){dims=multi?[1,h,n,m]:[1,n,m];meanings=multi?['Batch','Heads','Query tokens','Key tokens']:['Batch','Query tokens','Key tokens'];}
 else if(name==='Q'||name==='O'){dims=attn;meanings=multi?['Batch','Heads','Image tokens','Head dimension']:['Batch','Image tokens','Projected dimension'];}
 else {dims=[1,n,c];meanings=['Batch','Image tokens','Channels'];}
 return {dims,meanings,shape:`[${dims.join(', ')}]`};
}
const WHY:Record<TensorName,string>={feature:'U-Net 当前层的特征。每个空间位置对应一个 C 维向量。',X:'空间维变成序列长度 N=H×W，通道维成为 token 的向量维。',C:'文本编码器的上下文序列。真实模型包含起止 token 和补齐，77 是固定长度上限，并不代表 77 个单词。',Q:'来自图像的匹配查询。多头时把投影末维拆成 Heads × Head dimension。',K:'来自上下文的匹配特征。只有最后一维需要与 Q 相同。',V:'来自上下文的内容向量，供注意力权重加权读取。',score:'每个 Query 对每个 Key 的未缩放点积。行数与 image tokens 一致。',scaled:'点积除以 √d_head。缩放保持 shape 不变。',weights:'每行在 Key 轴上归一化；每个 Query 有自己的一组权重。',O:'每个 Query 按权重聚合 Value，输出序列长度仍为 image tokens。',projected:'各头拼接之后，Wo 将结果映射回图像通道。',restored:'序列还原为空间位置；它是注意力分支的更新量。',residual:'原特征与同尺寸的更新量相加，送入后续卷积/ResNet。'};
export default function Inspector({name,mode,kind,multi,selected,custom}: {name:TensorName;mode:Mode;kind:AttentionKind;multi:boolean;selected:number;custom?:CustomTensor|null}) {
 const spec=custom?{dims:custom.dims,meanings:custom.meanings,shape:`[${custom.dims.join(', ')}]`}:tensorSpec(name,mode,kind,multi);const [copied,setCopied]=useState(false);
 return <aside className="inspector"><div className="panel-heading"><Braces size={16}/><span>Tensor Inspector</span><span className="live-dot"/></div><div className="inspector-content"><div className="micro-label">CURRENT TENSOR</div><h2 style={{color:COLORS[name]}}>{custom?.title??NAMES[name]}</h2><button className="shape-box" onClick={()=>{navigator.clipboard?.writeText(spec.shape).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500)}).catch(()=>{});}} title="复制 Shape"><code>{spec.shape}</code>{copied?<Check size={14}/>:<Copy size={14}/>}</button><div className="dimension-list">{spec.dims.map((d,i)=><div key={i}><span><i style={{background:COLORS[name]}}/>{spec.meanings[i]}</span><b>{d}</b></div>)}</div><p>{custom?.description??WHY[name]}</p><div className="inspector-note"><Info size={15}/><span>{custom?'结构参考尺寸：展示数据的每一维含义。返回实验室查看教学数值。':mode==='sd'?'工程 Shape 以 SD 1.x 风格配置为参考。画布数字是独立 4 维 mock，不是这些大张量的真实切片。':'所有画布数字由 4 维矩阵实际计算，可逐项核算。使用教学投影，无训练权重。'}</span></div><div className="trace-label">正在追踪 <b>image token #{selected}</b></div><div className="legend"><span><i style={{background:'#62a9f6'}}/>图像 / Query</span><span><i style={{background:'#bc9bff'}}/>文本 / Key</span><span><i style={{background:'#f5bb67'}}/>Value / 输出</span><span><i style={{background:'#80d7bb'}}/>匹配 / 权重</span></div></div><div className="inspector-bottom"><span>点击彩色 Tensor 检查每一维</span><code>B · H · N · D</code></div></aside>;
}

