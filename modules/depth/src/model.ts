import architecture from './architecture.json';
export type Size='s'|'b'|'l'|'g';
export type Version='v1'|'v2';
export type Mode='teaching'|'real';
export type Config={mode:Mode;version:Version;size:Size;rawH:number;rawW:number;target:number};
export const fmt=(shape:number[])=>'['+shape.join(', ')+']';
// NumPy round uses ties-to-even. Mirror the official lower_bound Resize transform.
export function roundEven(x:number){const floor=Math.floor(x);return x-floor===0.5?(floor%2===0?floor:floor+1):Math.round(x)}
export function resizeShape(h:number,w:number,target:number){const scale=Math.max(target/h,target/w);const multiple=(x:number)=>{const rounded=roundEven(x/14)*14;return rounded<target?Math.ceil(x/14)*14:rounded};return [multiple(h*scale),multiple(w*scale)]}
export function getModel(c:Config){
 const source=architecture.models[c.size];
 const actual=c.version==='v1'?source.v1:source;
 if(!actual)throw Error('V1 does not provide ViT-G');
 const [h,w]=c.mode==='teaching'?[56,56]:resizeShape(c.rawH,c.rawW,c.target);
 const toy=c.mode==='teaching';
 return {h,w,ph:h/14,pw:w/14,n:h*w/196,dim:toy?8:source.dim,blocks:toy?4:source.blocks,heads:toy?2:source.heads,layers:toy?[0,1,2,3]:actual.layers,channels:toy?[4,8,8,8]:actual.channels,features:toy?8:actual.features,rawH:toy?56:c.rawH,rawW:toy?56:c.rawW};
}
export type Model=ReturnType<typeof getModel>;
export type Tensor={name:string;shape:number[];format:string;meaning:string;why:string;code:string;step:number;color:string};
export const stepNames=['Input RGB Image','Resize / Normalize','Patchify','Patch Embedding','Transformer Blocks','Extract Features 1–4','Token → Feature Map','Channel Projection','Multi-scale Resize','DPT Fusion 4','DPT Fusion 3','DPT Fusion 2','DPT Fusion 1','Prediction Head','Final Upsample','Depth Map'];
export const stepIds=['input','prep','patch','tokens','encoder','f1','reshape1','project1','resize1','fusion4','fusion3','fusion2','fusion1','head','output','depth'];
export const colors={input:'#eee4d3',patch:'#f5d9b9',encoder:'#dce7d8',token:'#e7dff0',feature:'#e6dbc6',reshape:'#e4dfef',project:'#eddacb',resize:'#eed9d1',scratch:'#e7e9d6',fusion:'#f4e6ba',head:'#eaccc0',depth:'#ded9cb'};
export function tensors(c:Config):Record<string,Tensor>{
 const m=getModel(c),{ph,pw,dim,n,features:k,h,w}=m;
 const record:Record<string,Tensor>={};
 const add=(id:string,name:string,shape:number[],format:string,meaning:string,why:string,code:string,step:number,color:string)=>record[id]={name,shape,format,meaning,why,code,step,color};
 add('input','RGB Image',[1,3,m.rawH,m.rawW],'B · C · H · W','B=1 张图，C=3 个 RGB 通道。上传图片只在你的浏览器中读取。','深度估计从单张 RGB 图片推断场景结构。输入不是深度传感器测量，遮挡区域与真实尺度存在歧义。','preprocess',0,colors.input);
 add('prep','Preprocessed Image',[1,3,h,w],'B · C · H · W',c.mode==='teaching'?'教学模式强制缩放为 56×56；真实预处理见 Real 模式。':`lower_bound=${c.target}，保留宽高比，取最接近的 14 倍数且不小于目标尺寸。RGB/255 后按 ImageNet mean/std 归一化。`,'DINOv2 的 patch 大小是 14，因此空间边长需能被 14 整除。真实模式遵循官方 Resize，不会把每张照片强制变成 518×518。','preprocess',1,colors.input);
 add('patch','Patch Grid',[1,3,ph,pw,14,14],'B · RGB · grid H · grid W · pH · pW',`${ph}×${pw}=${n} 个 patch；每块 14×14×3=588 个数。这里的 6 维张量是概念展开，官方用卷积直接实现。`,'14 来自采用的 DINOv2/14 预训练模型配置，并不是深度任务数学上只能用 14。切块让 Transformer 的序列长度从像素数降到 patch 数。','patch',2,colors.patch);
 add('tokens','Image Patch Tokens',[1,n,dim],'B · N · C',`一个 patch → 一个 ${dim} 维向量。实际 Conv2d(3,C,kernel=14,stride=14) 同时完成切块与线性投影。`,'向量编码一个 patch 的视觉特征，不能把它当成一个像素。Flatten 后乘矩阵的教学写法与这层卷积等价。','patch',3,colors.patch);
 add('position','CLS + Position',[1,n+1,dim],'B · (N+1) · C','添加 CLS token，插值位置编码并相加；本实验对应无 register token 的官方模型。','位置编码帮助 Transformer 区分图像位置。CLS token 提供全局表示，它没有对应的图像 patch。','token',4,colors.token);
 add('encoder','DINOv2 Transformer',[1,n+1,dim],'B · (N+1) · C',`${m.blocks} 个 blocks，${m.heads} 个 heads。每个 block 都维持 token 数与 embedding 维数；这里包含 CLS。`,'DINOv2 提取视觉表示：局部结构、边界、语义与全局关系。它不直接输出深度，后续 DPT Head 才学习从特征到 dense prediction 的映射。',c.version==='v1'?'encoderV1':'encoder',4,colors.encoder);
 for(let i=0;i<4;i++){
  const j=i+1,channels=m.channels[i],sh=[ph*4,ph*2,ph,Math.ceil(ph/2)][i],sw=[pw*4,pw*2,pw,Math.ceil(pw/2)][i];
  add(`f${j}`,`DINO Feature ${j}`,[1,n,dim],'B · N · C',`来自 block ${m.layers[i]}（0-based）= 第 ${m.layers[i]+1} 层。${ph}×${pw} patch tokens，已归一化并移除 CLS；CLS [1,${dim}] 单独返回。`,'不同层提供不同阶段的视觉表示。较浅偏局部、较深偏语义只是直觉，不是每个通道的严格定义；深度需要结构、边界和场景关系一起参与。',c.version==='v1'?'extractV1':'extract',5,colors.feature);
  add(`transpose${j}`,`Transpose Feature ${j}`,[1,dim,n],'B · C · N','permute(0,2,1) 只交换维度顺序，不创造新数据。','让每个 channel 的 N 个 token 成为一条空间数据序列，下一步按原始 patch 网格排列。','reshape',6,colors.reshape);
  add(`reshape${j}`,`Spatial Feature ${j}`,[1,dim,ph,pw],'B · C · Hₚ · Wₚ',`token index = row×${pw}+col；维度 C 成为 feature map 的 channels。CLS 不参与 reshape。`,'token 的序列位置一直与原 patch 的二维位置对应。注意 token 内容经过 attention 已混合全图信息，恢复的是坐标布局，不是恢复原像素。','reshape',6,colors.reshape);
  add(`project${j}`,`Projection ${j}`,[1,channels,ph,pw],'B · Cᵢ · Hₚ · Wₚ',`1×1 Conv：${dim} → ${channels} channels，空间大小不变。各分支 Cᵢ 可以不同。`,'这里主要调整通道数。随后 scratch 的 3×3 Conv 会把四个分支都变为同一个 decoder 通道数；不能说 projects 一步就让所有分支通道一致。','project',7,colors.project);
  add(`resize${j}`,`Multi-scale Feature ${j}`,[1,channels,sh,sw],'B · Cᵢ · Hᵢ · Wᵢ',[`ConvTranspose2d(k=4,s=4)：${ph}×${pw} → ${sh}×${sw}`,`ConvTranspose2d(k=2,s=2)：${ph}×${pw} → ${sh}×${sw}`,`Identity：保持 ${sh}×${sw}`,`Conv2d(k=3,s=2,p=1)：ceil(Hₚ/2)×ceil(Wₚ/2)=${sh}×${sw}`][i],'普通 ViT 各层网格相同，缺少 CNN 的天然空间金字塔。DPT 用可学习的上/下采样组织不同尺度，便于逐级恢复细节；上采样不等于凭空获得真实细节。','resize',8,colors.resize);
  add(`scratch${j}`,`Aligned Feature ${j}`,[1,k,sh,sw],'B · D · Hᵢ · Wᵢ',`scratch.layer${j}_rn：3×3 Conv，${channels} → ${k} channels，空间不变。`,'加法融合要求两个输入通道和空间尺寸相同。scratch 将每条分支的通道统一到 D，上一 Fusion 的输出已对齐下一 skip 的空间大小。','scratch',8,colors.scratch);
 }
 const outs=[[ph,pw],[ph*2,pw*2],[ph*4,pw*4],[ph*8,pw*8]];
 for(let i=4;i>=1;i--){const [oh,ow]=outs[4-i];add(`fusion${i}`,`Feature Fusion ${i}`,[1,k,oh,ow],'B · D · H · W',i===4?`只输入 F4 的 aligned feature，RCU2 后直接插值到 F3 的 ${oh}×${ow}；没有 skip 加法。`:`前一 decoder feature + RCU1(F${i} skip) → Add → RCU2 → Bilinear ${oh}×${ow} → 1×1 Conv。`,'先从最深分支建立粗略全局表示，再与对应分支合并细化。官方顺序是同尺度 Add、RCU，然后插值到下一尺度；Fusion 1 最后再扩大 2 倍。','fusion',13-i,colors.fusion)}
 add('head','Depth Head · 3×3 Conv',[1,k/2,ph*8,pw*8],'B · D/2 · H · W',`output_conv1：${k} → ${k/2} channels；当前空间仍是 patch grid 的 8 倍。`,'通过学习到的卷积把融合的特征逐渐压到深度表示。官方 Head 内部先做 output_conv1，再插值到预处理尺寸，最后用 output_conv2 输出一通道。','head',13,colors.head);
 add('headUp','Head · Internal Interpolation',[1,k/2,h,w],'B · D/2 · H · W','Bilinear，align_corners=True，输出 patch_h×14 和 patch_w×14。','此处在最终单通道预测之前恢复模型输入分辨率。后面还要把结果恢复到原始照片大小，这两个插值步骤作用不同。','head',13,colors.head);
 add('head32','Head · 3×3 Conv + ReLU',[1,32,h,w],'B · 32 · H · W',`${k/2} → 32 channels，3×3 Conv + ReLU。教学模式也保留官方的 32 通道 Head。`,'多个视觉特征通道先学习到 32 个中间通道，再由 1×1 Conv 组合为单个预测值。','head',13,colors.head);
 add('prediction','Head · Single-channel Prediction',[1,1,h,w],'B · 1 · H · W','1×1 Conv(32→1) + ReLU，每个空间位置一个非负的相对深度预测。','一通道表示每个位置一个标量；RGB 的三个通道表示颜色。一通道的值由深度监督学来，其物理含义不能仅凭 channel 数决定。','head',13,colors.head);
 add('squeeze','forward() Return',[1,h,w],'B · H · W','官方 forward 使用 squeeze(1)。用于最终插值时再加回单通道维度。','[B,1,H,W] 是 Head 的输出，官方 forward 的返回值则为 [B,H,W]。必须区别函数边界与概念深度张量。','extract',13,colors.head);
 add('output','Restore Original Resolution',[1,1,m.rawH,m.rawW],'B · 1 · H₀ · W₀',`最终双线性插值到原图 ${m.rawH}×${m.rawW}。${c.version==='v1'?'V1 run.py 的外部插值 align_corners=False。':'V2 infer_image 的外部插值 align_corners=True。'}`,'最终要求原图的每个像素都有一个值，因此要恢复原始空间尺寸。此网站展示 shape 与模拟输出，不执行神经网络推理。','output',14,colors.depth);
 add('depth','Depth Map',[m.rawH,m.rawW],'H₀ · W₀',`${c.version==='v1'?'V1 run.py':'V2 infer_image'} 返回二维深度数组；展示用归一化值为模拟 inverse-depth-like 标量，较大值示意较近。不是米。`,'基础模型预测相对深度结构，不能把 0.72 解释为 0.72 米。Metric 模型需要额外的度量训练、校准或相应 checkpoint。',c.version==='v1'?'outputV1':'output',15,colors.depth);
 record.head32.code='headLayers';record.prediction.code='headLayers';record.squeeze.code='squeeze';
 if(c.version==='v1'){record.output.code='outputV1';record.prep.code='preprocessV1';record.input.code='preprocessV1'}
 return record;
}
export function history(c:Config,branch:number){const j=branch+1;return ['input','prep','patch','tokens','position','encoder',`f${j}`,`transpose${j}`,`reshape${j}`,`project${j}`,`resize${j}`,`scratch${j}`,...Array.from({length:j},(_,i)=>`fusion${j-i}`),'head','headUp','head32','prediction','squeeze','output','depth']}
export {architecture};
