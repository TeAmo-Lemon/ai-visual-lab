import {useState} from 'react';
import {Tensor,Vector,Arrow,MatrixGrid} from './Tensors';
import {WQ,WK,WV,fmt,type computeAttention} from '../lib/math';
import type {TensorName} from '../lib/content';
type Data=ReturnType<typeof computeAttention>;
export default function ProjectionStage({target,data,selected,shape,onInspect}: {target:'Q'|'K'|'V';data:Data;selected:number;shape:(n:TensorName)=>string;onInspect:(n:TensorName)=>void}) {
 const [showWeights,setShowWeights]=useState(false);
 const [token,setToken]=useState(0);
 const isQuery=target==='Q',isSelf=data.tokens[0].startsWith('img #'),i=isQuery?selected:Math.min(token,data.c.length-1);
 const weights=isQuery?WQ:target==='K'?WK:WV;
 const input=isQuery?data.x[i]:data.c[i],output=isQuery?data.q[i]:target==='K'?data.k[i]:data.v[i];
 const color=isQuery?'#62a9f6':target==='K'?'#bc9bff':'#f5bb67';
 return <div className="stage-content"><div className="projection-flow"><div className="projection-node"><Tensor name={isQuery||isSelf?'X':'C'} shape={shape(isQuery||isSelf?'X':'C')} onSelect={onInspect}/><span>{isQuery||isSelf?`image token #${i}`:`text token: ${data.tokens[i]}`}</span><Vector values={input} color={isQuery||isSelf?'#62a9f6':'#bc9bff'}/></div><Arrow label="Linear"/><button className="linear-node" style={{'--tensor-color':color} as React.CSSProperties} onClick={()=>setShowWeights(!showWeights)}><span>LEARNED PROJECTION</span><b>W{target.toLowerCase()}</b><code>{isQuery||isSelf?'C → D':'context_dim → D'}</code><small>{showWeights?'收起权重 ↑':'查看 4×4 权重 ↗'}</small></button><Arrow/><div className="projection-node"><Tensor name={target} shape={shape(target)} onSelect={onInspect}/><span>{target.toLowerCase()}<sub>{i}</sub></span><Vector values={output} color={color}/></div></div>
 {!isQuery&&<div className="token-tabs">{data.tokens.slice(0,12).map((t,j)=><button key={j} className={i===j?'active':''} onClick={()=>setToken(j)}>{t}</button>)}</div>}
 {showWeights&&<div className="weight-details"><span className="micro-label">数值示例的投影矩阵 · 行为输入维，列为输出维</span><MatrixGrid values={weights} selectedRow={-1}/></div>}
 <div className="calculation-card"><div className="micro-label">查看一个 {isQuery||isSelf?'IMAGE':'TEXT'} TOKEN · 当前 HEAD 第 0 维</div><code>{input.map((x,j)=>`${fmt(x,2)} × ${fmt(weights[j][data.headOffset],2)}`).join(' + ')} = {fmt(output[0])}</code><p>每个输出维都由输入向量与权重矩阵的一列做点积。{output.length===2?'当前显示拆头后的 2 维，使用完整投影的第 '+data.headOffset+' 列。':'这里显示完整 4 维投影的第 0 列。'}</p></div>
 <div className="insight"><b>{isQuery?'同一位置，新角色':target==='K'?'Key 用来匹配':'Value 用来传递'}</b><p>{isQuery?'位置编号保留；改变的是特征的表示方式。Query 本身不会移动到文本中。':target==='K'?'K 与 Q 的最后一维相同，序列长度可以不同。Wk 与 Wv 是不同的训练参数。':'即使 K 与 V 来自同一个词，二者通常有不同的数值。接下来先用 K 算关注比例，再用 V 读取内容。'}</p></div></div>;
}
