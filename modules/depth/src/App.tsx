import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Play,Pause,Upload,Code2} from 'lucide-react';
import {fmt,getModel,tensors,stepIds,history,type Config,type Size,type Version} from './model';
import mapping from './code-map.json';
import {Architecture,CourseDetail,courseTitles,courseSpec} from './Course';
import {AttentionLab,CompareLab,TrainingLab,MistakesLab} from './MoreLabs';
type View='overview'|'course'|'attention'|'compare'|'training'|'mistakes';
const tabs:[View,string][]=[['overview','完整架构'],['course','逐步学习'],['attention','Attention'],['compare','架构对比'],['training','训练'],['mistakes','误区与自测']];
export default function App(){
 const [config,setConfig]=useState<Config>({mode:'real',version:'v2',size:'l',rawH:518,rawW:518,target:518});
 const m=useMemo(()=>getModel(config),[config]),data=useMemo(()=>tensors(config),[config]);
 const [view,setView]=useState<View>('overview'),[step,setStep]=useState(0),[selected,setSelected]=useState('input'),[patch,setPatch]=useState(10),[image,setImage]=useState<string>(),[error,setError]=useState(''),[playing,setPlaying]=useState(false),[trace,setTrace]=useState(false);
 const uploadRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{setPatch(p=>Math.min(p,m.n-1))},[m.n]);
 useEffect(()=>{if(!playing)return;const t=setInterval(()=>setStep(s=>{if(s===15){setPlaying(false);return s}return s+1}),2600);return()=>clearInterval(t)},[playing]);
 useEffect(()=>{setSelected(stepIds[step])},[step]);
 useEffect(()=>{if(!image)return;return()=>URL.revokeObjectURL(image)},[image]);
 const current=data[selected]??data.input,code=mapping[current.code as keyof typeof mapping]??mapping.encoder,spec=courseSpec(step,m,data);
 function learn(s:number){setStep(s);setSelected(stepIds[s]);setView('course');setPlaying(false)}
 function navigate(v:View){setView(v);setPlaying(false)}
 function inspect(id:string){setSelected(id)}
 function fromMistake(v:string){learn(({encoder:4,reshape:6,dpt:8,depth:15,patch:2} as Record<string,number>)[v]??0)}
 function version(v:Version){setConfig(c=>({...c,version:v,size:v==='v1'&&c.size==='g'?'l':c.size}))}
 function upload(file?:File){if(!file)return;if(!file.type.startsWith('image/')){setError('请选择图片文件。');return}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{setImage(url);setConfig(c=>({...c,rawH:img.naturalHeight,rawW:img.naturalWidth}));setError('');learn(0)};img.onerror=()=>{URL.revokeObjectURL(url);setError('无法读取图片，请使用 PNG、JPEG 或 WebP。')};img.src=url}
 return <div className="app-shell">
  <header className="topbar"><div><h1>Depth Anything</h1><p>架构与 Tensor 维度</p></div><a href="https://github.com/DepthAnything/Depth-Anything-V2" target="_blank" rel="noreferrer">官方代码 ↗</a></header>
  <div className="controls"><div className="control-row"><div className="segmented" aria-label="模型版本">{(['v1','v2'] as Version[]).map(v=><button className={config.version===v?'active':''} key={v} onClick={()=>version(v)}>{`Depth Anything ${v.toUpperCase()}`}</button>)}</div><label>Encoder <select aria-label="Model Size" value={config.size} onChange={e=>setConfig(c=>({...c,size:e.target.value as Size}))}>{(['s','b','l','g'] as Size[]).filter(s=>config.version==='v2'||s!=='g').map(s=><option value={s} key={s}>ViT-{s.toUpperCase()}</option>)}</select></label><div className="segmented"><button className={config.mode==='teaching'?'active':''} onClick={()=>setConfig(c=>({...c,mode:'teaching'}))}>教学例子 · 16 tokens</button><button className={config.mode==='real'?'active':''} onClick={()=>setConfig(c=>({...c,mode:'real'}))}>真实模型</button></div><button onClick={()=>uploadRef.current?.click()}><Upload size={17}/>上传图片</button><input ref={uploadRef} hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></div>
   <div className="config-facts"><span>输入 <b>{m.rawH}×{m.rawW}</b></span><span>预处理 <b>{m.h}×{m.w}</b></span><span>Patch 网格 <b>{m.ph}×{m.pw}</b></span><span>N=<b>{m.n}</b></span><span>Encoder C=<b>{m.dim}</b></span><span>Decoder D=<b>{m.features}</b></span></div>
   {config.mode==='teaching'&&<p className="mode-note">教学例子：56×56 输入、C=8、4 个 blocks，用于观察排列。它不是已发布的模型配置。</p>}{error&&<p role="alert">{error}</p>}
  </div>
  <nav className="main-nav">{tabs.map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>navigate(id)}>{label}</button>)}</nav>
  <main>
   <div className="axis-key"><span><b>B</b> batch，当前为 1</span><span><b>N</b> patch 数，{m.ph}×{m.pw}={m.n}</span><span><b>C</b> Encoder 特征维数，{m.dim}</span><span><b>D</b> Decoder 通道数，{m.features}</span><span><b>H / W</b> 当前网格的高 / 宽</span></div>
   {view==='overview'&&<><div className="page-title"><div><h2>完整前向架构</h2><p>从上向下读。四列是四条并行特征分支，右侧黄色路径是逐级融合。</p></div><button className="primary" onClick={()=>learn(0)}>从第 1 步开始 <ArrowRight size={18}/></button></div><Architecture config={config} m={m} data={data} selected={selected} onInspect={inspect} onLearn={learn}/></>}
   {view==='course'&&<><div className="course-top"><div><span className="step-count">第 {step+1} / 16 步</span><h2>{courseTitles[step]}</h2></div><div className="course-actions"><button aria-label="Reset" onClick={()=>learn(0)}>回到第 1 步</button><button onClick={()=>setPlaying(!playing)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'暂停':'自动逐步播放'}</button></div></div>
    <div className="step-track"><div className="track-fill" style={{width:`${step/15*100}%`}}/><span className="flow-dot" style={{left:`${step/15*100}%`}}/></div>
    <details className="step-index"><summary>全部 16 步 · 当前：{courseTitles[step]}</summary><div className="step-buttons">{courseTitles.map((name,i)=><button aria-label={`Step ${i+1}: ${name}`} className={step===i?'active':''} key={name} onClick={()=>learn(i)}><b>{i+1}</b>{name}</button>)}</div></details>
    <p className="step-explanation">{spec.explain}</p><div className="io-grid"><section><h3>输入</h3>{spec.inputs.map(id=><button className="tensor-card" key={id} onClick={()=>inspect(id)}><span>{data[id].name}</span><code>{fmt(data[id].shape)}</code><small>{data[id].format}</small></button>)}</section><section className="operation-card"><h3>→ 执行操作 →</h3>{spec.ops.map(op=><p key={op}>{op}</p>)}</section><section><h3>输出</h3>{spec.outputs.map(id=><button className="tensor-card" key={id} onClick={()=>inspect(id)}><span>{data[id].name}</span><code>{fmt(data[id].shape)}</code><small>{data[id].format}</small></button>)}</section></div>
    <div className="continuity">{step>0&&<span>← 上一步：{courseTitles[step-1]}</span>}{step<15&&<span>本步输出 → 下一步：{courseTitles[step+1]}</span>}</div>
    <CourseDetail key={step} step={step} m={m} config={config} data={data} image={image} patch={patch} onPatch={setPatch} onInspect={inspect} onAttention={()=>navigate('attention')} onTrace={()=>setTrace(true)} onOverview={()=>navigate('overview')}/>
    {step===15&&trace&&<div className="trace-paths"><h3>四条输入路径</h3>{[0,1,2,3].map(j=><details key={j}><summary>F{j+1} → Depth Map</summary><div className="history-chain">{history(config,j).map(id=><button key={id} onClick={()=>inspect(id)}>{data[id].name}<code>{fmt(data[id].shape)}</code><span>↓</span></button>)}</div></details>)}</div>}
    <div className="course-bottom"><button disabled={step===0} onClick={()=>learn(step-1)}><ArrowLeft size={18}/>上一步{step>0&&`：${courseTitles[step-1]}`}</button><button className="primary" disabled={step===15} onClick={()=>learn(step+1)}>下一步{step<15&&`：${courseTitles[step+1]}`}<ArrowRight size={18}/></button></div>
   </>}
   {view==='attention'&&<AttentionLab m={m} image={image} selected={patch} onSelect={setPatch}/>}
   {view==='compare'&&<CompareLab config={config} onTensor={inspect}/>}
   {view==='training'&&<TrainingLab version={config.version}/>}
   {view==='mistakes'&&<MistakesLab onNavigate={fromMistake}/>}
   <section className="tensor-inspector" aria-label="当前 Tensor"><div className="inspector-top"><div><h3>当前 Tensor：{current.name}</h3><code className="tensor-shape">{fmt(current.shape)}</code></div><div className="axis-values">{current.format.split(' · ').map((axis,i)=><span key={i}><b>{axis}</b> = {current.shape[i]}</span>)}</div></div><p>{current.meaning}</p><details className="code-details"><summary><Code2 size={18}/>对应官方代码 · {current.code}</summary><pre><code>{code.code}</code></pre><a href={code.url} target="_blank" rel="noreferrer">打开官方实现 · 第 {code.line} 行 ↗</a></details></section>
  </main><footer>Shape 按官方 V1 / V2 实现计算。动画、特征值、Attention 和深度颜色用于教学；本站不运行模型权重。上传图片只在浏览器本地读取。</footer>
 </div>
}
