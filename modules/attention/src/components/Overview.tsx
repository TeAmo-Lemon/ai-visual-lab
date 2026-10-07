import {useState} from 'react';
import {Arrow} from './Tensors';
import {ChevronRight} from 'lucide-react';
import type {CustomTensor} from './Inspector';
const DETAILS:Record<string,string>={
 Image:'输入图像以像素 RGB 表示。这里以 256×256 为尺寸示例；它与 U-Net 的 feature map 是不同的数据。',
 'VAE Encoder':'VAE 把像素图像压缩到低维 latent。SD 1.x 的 VAE 通常把空间尺寸缩小 8 倍，并使用 4 个 latent 通道。',
 'Latent z':'z 是 VAE 表示，不是 U-Net 的 320 维 feature。U-Net 的输入卷积会把 4 个 latent 通道投影到更多特征通道。',
 'Add Noise':'训练时按时间步 t 混合干净 latent 与随机高斯噪声。不同 t 对应不同噪声程度。',
 'Noisy latent zₜ':'含噪 latent 和时间步 t 一起输入 U-Net。文本生成从高斯噪声开始，不必先经过 Image → VAE Encoder。',
 'U-Net':'U-Net 用卷积处理空间信息，并在多个分辨率引入 Attention。它接收 zₜ、时间步 t、文本条件 C，输出噪声预测 εθ。点击进入内部。',
 'Predicted noise ε':'SD 1.x 的经典配置预测噪声 εθ(zₜ,t,C)。预测的 shape 与输入 latent 一致，不是直接输出 RGB 图像。',
 Denoising:'采样器结合当前 zₜ、εθ 与噪声日程得到更干净的 zₜ₋₁。它多次重复调用 U-Net；这是迭代过程。',
 'Clean latent z₀':'完成采样后得到去噪的 latent。文本条件已经通过多层 Cross Attention 影响了迭代中的噪声预测。',
 'VAE Decoder':'VAE Decoder 把最终 latent 解码回像素空间。Attention 本身不会把 token 直接变成像素图像。',
 'Output image':'最终 RGB 图像由 VAE 解码生成。条件是否实现依赖整体模型、学习权重与采样，而非某一格注意力分数。',
 Prompt:'自然语言描述作为条件输入。它并不是一张要与图像逐元素相加的特征图。',
 Tokenizer:'真实 CLIP 使用 BPE 子词 tokenizer。网页的按词切分只是为了展示数据流；一个单词可能对应多个真实 token。',
 'Text Encoder / CLIP':'编码器为每个文本位置生成上下文向量。SD 1.x 常见长度为 77、维度为 768，含起止 token 和补齐。',
 'Text embedding C':'每个 Cross Attention 层用自己学习到的 Wk、Wv，把同一份文本条件分别投影成 Key 和 Value。',
 'Cross Attention':'图像生成 Query；文本生成 Key 与 Value。不同图像位置分别读出不同权重的条件信息。',
};
const SHAPES:Record<string,number[]>={Image:[1,3,256,256],'Latent z':[1,4,32,32],'Noisy latent zₜ':[1,4,32,32],'Predicted noise ε':[1,4,32,32],'Clean latent z₀':[1,4,32,32],'Output image':[1,3,256,256],'Text embedding C':[1,77,768]};
export default function Overview({onUNet,onLab,onSpec}: {onUNet:()=>void;onLab:(s?:number)=>void;onSpec:(s:CustomTensor)=>void}){
 const [active,setActive]=useState('U-Net');
 const inspect=(label:string)=>{setActive(label);if(SHAPES[label])onSpec({title:label,dims:SHAPES[label],meanings:label==='Text embedding C'?['Batch','Text tokens','Context dim']:['Batch','Channels','Height','Width'],description:DETAILS[label]});};
 const node=(label:string,small?:string,index?:number)=><button key={label} className={`pipeline-node ${label==='U-Net'?'unet-node':''} ${active===label?'selected':''}`} onClick={()=>label==='U-Net'?onUNet():inspect(label)} title={DETAILS[label]}>{index!==undefined&&<small className="node-index">{String(index+1).padStart(2,'0')}</small>}{['Image','Latent z','Noisy latent zₜ','Clean latent z₀','Output image'].includes(label)&&<div className={`mini-grid ${label.includes('Noisy')?'noisy':''}`}>{Array.from({length:16},(_,i)=><i key={i} style={{opacity:.2+((i*7+3)%11)/14}}/>)}</div>}<b>{label}</b><code>{small}</code>{label==='U-Net'&&<span>展开内部 <ChevronRight size={12}/></span>}</button>;
 return <><div className="page-heading"><h1>Latent Diffusion 数据流</h1><p>完整 Latent Diffusion 路径 · 点击任一节点，查看它处理的数据。</p></div><div className="overview-card"><div className="panel-heading">LATENT DIFFUSION <span className="diagram-label">以 256×256 输入说明尺寸</span></div><div className="ldm-flow"><span className="flow-row-label">01 / 编码与加噪 · 训练或 image-to-image 路径</span><div className="flow-row">{node('Image','3 × 256 × 256',0)}<Arrow/>{node('VAE Encoder','空间 ↓ 8×',1)}<Arrow/>{node('Latent z','4 × 32 × 32',2)}<Arrow/>{node('Add Noise','t / noise schedule',3)}<Arrow/>{node('Noisy latent zₜ','4 × 32 × 32',4)}</div><div className="flow-turn"><span>zₜ + timestep t</span><svg viewBox="0 0 750 42" aria-label="含噪 latent 传入下一行的 U-Net"><path d="M690 0 V20 H50 V40 l-5 -6 m5 6 l5 -6" fill="none" stroke="#48602f" strokeWidth="1.4"/></svg></div><span className="flow-row-label">02 / 条件去噪 · 重复 T 个采样步骤</span><div className="flow-row denoise-row">{node('U-Net','εθ(zₜ, t, C)',5)}<Arrow/>{node('Predicted noise ε','4 × 32 × 32',6)}<Arrow/>{node('Denoising','zₜ → zₜ₋₁',7)}<Arrow/>{node('Clean latent z₀','4 × 32 × 32',8)}</div><div className="loop-caption"><svg viewBox="0 0 470 30"><path d="M440 2 V20 H20 V2" stroke="#48602f" strokeWidth="1" strokeDasharray="4 4" fill="none"/></svg><span>采样器迭代：下一步的 zₜ 再送入 U-Net</span></div><div className="decode-row"><span className="flow-row-label">03 / 解码</span>{node('VAE Decoder','latent → pixels',9)}<Arrow/>{node('Output image','3 × 256 × 256',10)}</div></div><div className="condition-flow"><span className="micro-label">文本条件路径 · 每次去噪都使用 C</span><div className="text-pipeline">{['Prompt','Tokenizer','Text Encoder / CLIP','Text embedding C','Cross Attention'].map((t,i)=><div className="condition-node-wrap" key={t}><button onClick={()=>{inspect(t);if(t==='Cross Attention')onLab()}} className={active===t?'selected':''} title={DETAILS[t]}>{t}{t==='Text embedding C'&&<code>[1,77,768]</code>}</button>{i<4&&<Arrow/>}</div>)}</div><div className="condition-connector">↑ Cross Attention 位于 U-Net 的内部 <button onClick={onUNet}>查看位置 ↗</button></div></div></div><div className="node-detail"><span className="micro-label">SELECTED BLOCK</span><h3>{active}</h3><p>{DETAILS[active]}</p>{['Tokenizer','Text Encoder / CLIP','Text embedding C'].includes(active)&&<button className="secondary-button" onClick={()=>onLab(3)}>展开编码过程 →</button>}</div><div className="overview-notes"><p><b>文本生成</b>从随机噪声 latent 开始；<b>训练 / image-to-image</b>使用上方的编码、加噪路径。</p></div></>;
}

