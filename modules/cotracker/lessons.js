import {source,reference,mappings,SHA} from './sources.js';
export const chapters=[
  {id:'task',title:'先弄懂任务',question:'模型到底要找到什么？',time:'3 分钟'},
  {id:'architecture',title:'走一遍完整架构',question:'输入怎样变成轨迹？',time:'5 分钟'},
  {id:'features',title:'把图像变成特征',question:'模型用什么比较两个位置？',time:'3 分钟'},
  {id:'correlation',title:'理解 4D 相关性',question:'两个小邻域为什么是 4D？',time:'5 分钟'},
  {id:'joint',title:'拆开联合 Transformer',question:'一个点如何借助其他帧和点？',time:'5 分钟'},
  {id:'refinement',title:'看懂迭代与遮挡',question:'为什么要反复猜、匹配、修正？',time:'4 分钟'},
  {id:'modes',title:'理解两种运行方式',question:'Online 与 Offline 改变了什么？',time:'3 分钟'},
  {id:'training',title:'模型怎样学会追踪',question:'没有人工标签，怎么训练？',time:'4 分钟'},
  {id:'recap',title:'把架构串起来',question:'现在能独立讲清一次推理吗？',time:'3 分钟'}
];
export const glossary={
  Query:['已知起点','你指定的“第几帧、横坐标、纵坐标”，记为 Q = (tq, xq, yq)。模型要在其他帧追踪同一个物理点。它与 attention 计算里的 Query 矩阵不是同一个概念。'],
  P:['位置 / Position','Pₜⁱ = (x, y)：第 i 个点在第 t 帧的位置估计。所有帧的 P 连起来是一条轨迹。内部用特征坐标，最终转换为像素坐标。'],
  V:['可见性 / Visibility','当前帧是否看得见这个物理点。底层模型输出概率；循环内部维护 logit。这里的 V 不是注意力公式中的 Value 矩阵。'],
  C:['位置置信度 / Confidence','预测位置是否落在真值附近。合成训练用“距离真值在 12 像素内”的标签监督，且代码按真值可见性掩码。它与“看得见吗”不同；遮挡状态下的数值不代表经过充分校准的准确性保证。'],
  feature:['特征 / Feature','CNN 从 RGB 学到的数字表示。在本实现中，一个特征图格点有 128 个数，用来表示这个位置的纹理和结构。特征图仍保留空间位置。'],
  patch:['局部邻域 / Patch','以某个位置为中心，从特征图采样的一小片特征。这里是 7×7 个位置，每个位置有一个特征向量。它不是 ViT 输入图像切块的意思。'],
  correlation:['相关性 / Correlation','两个特征向量的点积；值反映匹配证据。把两个邻域的所有位置两两比较，会得到一个局部 4D 相关性体。它还不是坐标预测。'],
  MLP:['多层感知机','一组可学习的全连接层。在 correlation 路径上，它把 2401 个匹配值压缩成 256 个数。它整理匹配模式，位置增量由后面的网络输出。'],
  token:['追踪状态单元 / Token','这里一个 token 对应“一个点在一帧里的当前状态”，由匹配证据、运动表示、可见性和置信度构成。它不是一个 RGB 像素，也不是语言中的词。'],
  proxy:['代理 / Virtual track','可学习的隐藏 token，用来汇集和分发同一帧中不同轨迹的信息。官方使用 64 个。它没有对应的用户图像坐标，最终不会作为轨迹输出。'],
  support:['辅助追踪点 / Support point','额外采样的真实图像点，与用户点一起追踪，给模型提供上下文。它与没有图像坐标的 proxy 不同。便捷 Offline predictor 对显式 queries 默认追加 6×6 的辅助网格，返回时去掉辅助轨迹。'],
  logit:['概率转换前的数值','网络内部可正可负的数，经 sigmoid 才转成 0 到 1 的概率。零 logit 对应 0.5，而不是零概率。'],
  Fourier:['运动的 Fourier 编码','把相邻帧的坐标差转换为包含不同频率 sin/cos 的表示，帮助网络表达运动变化。它描述当前估计的运动；时间编码则另外告诉网络帧顺序。'],
  teacher:['教师 / Teacher','在真实视频训练中，给当前视频生成伪轨迹标签的已训练 tracker。教师参数冻结；每个 batch 随机选择一个教师。部署后的推理不需要教师。'],
  SIFT:['选取训练起点的检测器','在真实训练视频里找纹理较丰富、相对适合追踪的位置，产生 queries。它不负责推理时的特征提取，那个任务由 CNN 完成。']
};
const term=(key,label=key)=>`<button class="term" data-term="${key}">${label}<span aria-hidden="true">?</span></button>`;
const panel=(title,body,cls='')=>`<section class="panel ${cls}"><h2>${title}</h2>${body}</section>`;
const note=body=>`<p class="note">${body}</p>`;
const details=(title,body)=>`<details><summary>${title}</summary><div class="detail-body">${body}</div></details>`;
const flow=(title,body,tone='green')=>`<div class="flow-card ${tone}"><b>${title}</b><p>${body}</p></div>`;
const arrow='<span class="flow-arrow" aria-hidden="true">→</span>';
const takeaway=(body,next)=>`<div class="takeaway"><span>这一章带走一句话</span><p>${body}</p>${next?`<small>下一章：${next}</small>`:''}</div>`;
export const quizzes={
  task:{question:'点被遮挡后，模型仍然需要输出什么？',choices:['只有一个“看不见”的标志','位置估计，以及可见性和置信度','遮挡物的中心坐标'],answer:1,why:'追踪目标是同一个物理点。即使当前看不见它，模型仍维护它的位置估计，并单独预测可见性与位置置信度。'},
  correlation:{question:'局部 4D correlation 中的四个维度是？',choices:['x、y、z、时间','两帧的编号，以及两个点的编号','Query 邻域的两个空间索引 + 当前邻域的两个空间索引'],answer:2,why:'一个匹配值需要指定 Query 邻域的 (uq, vq) 和当前邻域的 (ut, vt)。时间和点编号是外层维度，不是这里“4D”的含义。'},
  joint:{question:'Transformer 里一个真实轨迹 token 对应什么？',choices:['一个点在一帧中的追踪状态','整段视频压成一个向量','原始图像中的一个 RGB 像素'],answer:0,why:'因此有 T × N 个真实轨迹 token。时间注意力沿一个点跨帧交流；同帧点之间通过代理交流。'},
  refinement:{question:'位置 P 更新以后，下一轮最关键的变化是什么？',choices:['重新跑一遍完整 CNN','在新位置重新采样 current patch，再计算 correlation','直接复用上一轮 correlation'],answer:1,why:'图像特征和固定 Query patch 可缓存，但 current patch 的中心由 P 决定。P 一变，匹配证据必须重新取得。'},
  training:{question:'部署后的 CoTracker3 推理，需要哪些组件？',choices:['训练好的 tracker + 视频和 queries','SIFT + 全部教师 + student','先生成伪标签，再运行 student'],answer:0,why:'教师、SIFT 训练采样和损失函数属于训练流程。推理时，用户或采样网格提供 queries，训练好的 tracker 直接估计轨迹。'}
};
export function quiz(id){const q=quizzes[id];return `<section class="check" aria-labelledby="check-${id}"><p class="eyebrow">CHECK YOUR UNDERSTANDING</p><h2 id="check-${id}">${q.question}</h2><div class="quiz-options">${q.choices.map((s,i)=>`<button data-answer="${id}:${i}" aria-pressed="false"><span>${String.fromCharCode(65+i)}</span>${s}</button>`).join('')}</div><p id="feedback-${id}" class="quiz-feedback" aria-live="polite"></p></section>`;}

export const stages=[
  {title:'输入：视频 + 已知起点',input:'6 帧视频，以及 A、B、C 的 queries。',action:'视频提供要比较的图像，Q 指定追踪对象和参照帧。把 query 的空间坐标复制到各帧，作为初始猜测。',output:'Video / Q；初始 P，以及零初始化的 V、C logit。'},
  {title:'CNN：提取可比较的图像表示',input:'每一帧的 RGB 图像。',action:'fnet 逐帧提取 128 通道的特征图，再用 pooling 建立四个尺度。它不负责预测轨迹。',output:'四尺度 feature maps。一次 forward 内缓存，更新循环中不重跑 CNN。'},
  {title:'采样：固定参照 + 当前猜测',input:'特征图、已知 Q 和当前 P。',action:'Query 分支在已知点周围取固定邻域；current 分支在每帧当前估计周围取邻域。两个分支都来自特征图。',output:'每个尺度：一个固定 Query patch，以及每帧一个 current patch。'},
  {title:'匹配：把比较结果变成证据',input:'两个局部 feature patches。',action:'把两边所有位置的特征两两做点积；共享 MLP 把各尺度的匹配模式压缩，再拼接。',output:'每个点、每帧一个 1024 维 correlation feature。它描述匹配证据，不是最终坐标。'},
  {title:'联合更新：理解状态并预测增量',input:'Correlation + 当前相邻位移的 Fourier 编码 + V/C。',action:'拼成 1110 维 token，加时间编码，投影到 384 维；三组时间注意力与代理空间通信融合上下文。两个输出头分别预测位置和 V/C 的增量。',output:'ΔP = (Δx, Δy)，以及 ΔV / ΔC logit。'},
  {title:'相加并反馈：进入下一轮',input:'旧 P/V/C，以及刚预测的增量。',action:'旧状态 + 增量 = 新状态。新 P 改变 current patch 的采样中心；新位移和 V/C 进入下一轮 token。重复匹配和更新。',output:'结束迭代后：像素坐标轨迹，以及 sigmoid 后的 V/C 概率。'}
];
export function architectureMap(stage=0){
  const node=(n,title,body,cls='')=>`<button data-stage="${n}" class="arch-node ${cls} ${stage===n?'active':''}" aria-pressed="${stage===n}"><span class="node-step">${n+1}</span><b>${title}</b><small>${body}</small></button>`;
  return `<div class="architecture-map" aria-label="完整 CoTracker3 推理数据流">
    <div class="arch-inputs">${node(0,'视频 Video','所有帧的 RGB 图像')}${node(0,'已知起点 Q','参照帧 + x + y','gold')}</div>
    <div class="arch-columns"><div class="arch-column"><span class="connector">↓ 图像</span>${node(1,'CNN → 四尺度特征图','1/4 · 1/8 · 1/16 · 1/32')}</div><div class="arch-column"><span class="connector">↓ 复制坐标到各帧</span>${node(0,'初始 P / V / C','位置来自 Q；V/C logit 为 0','rose')}</div></div>
    <div class="map-routing"><b>四尺度特征图 → 同时供给左右两条采样路径</b><span>Q 指定左侧参照帧与中心；当前 P 指定右侧中心 ↓</span></div>
    <div class="arch-inputs">${node(2,'固定 Query patch','Q + Query 帧特征图 → 固定邻域；缓存','gold')}${node(2,'当前帧 current patch','当前 P + 当前帧特征图 → 当前邻域；每轮改变')}</div>
    <div class="merge-connector">↘ 两个邻域的所有位置，两两比较 ↙</div>
    ${node(3,'局部 4D correlation → 共享 MLP → 四尺度拼接','每个尺度 2401 → 256；拼接为 1024 维','purple')}
    <div class="token-recipe"><span>↓ 匹配证据</span><span>← 当前相邻位移 → Fourier 84 维</span><span>← 当前 V/C logit 2 维</span></div>
    ${node(4,'每个点、每一帧的 token → 联合 Transformer','拼接 1110 + 时间编码 → 384；时间注意力 + 代理通信','purple')}
    <div class="arch-heads"><div>位置头 flow_head<b>Δx、Δy</b></div><div>可见性 / 置信度头 vis_conf_head<b>ΔV、ΔC</b></div></div>
    <span class="connector">↓ 预测增量，加到旧状态</span>
    ${node(5,'更新后的 P / V / C','P ← P + ΔP；V ← V + ΔV；C ← C + ΔC','rose')}
    <div class="feedback-path"><b>↶ 新 P → current patch → 重新计算 correlation</b><span>新 P 的相邻位移 + 新 V/C → 下一轮 token。特征图与固定 Query patch 保留。</span></div>
    <div class="arch-output"><span>迭代结束 ↓</span><b>轨迹 P（像素坐标） + 可见性 V + 位置置信度 C（概率）</b></div>
  </div>`;
}

export function lessonContent(id){switch(id){
case 'task':return `
  <div class="intro-banner"><span class="badge">从零开始 · 不要求读过论文</span><p>假设你在一个移动的小车上点了 A。它经过柱子后再次出现：<b>模型要找回同一个物理点 A，而不是找一辆相似的小车。</b>后面所有图都沿用这个例子。</p></div>
  ${panel('先看输入，再看要得到的答案',`<div class="controls"><label>参照帧 <select id="query-frame"><option value="0">第 1 帧</option><option value="1">第 2 帧</option><option value="4">第 5 帧</option><option value="5">第 6 帧</option></select></label><label>追踪点 <select id="query-point"><option value="0">A</option><option value="1">B</option><option value="2">C</option></select></label><div class="segmented" role="group" aria-label="观察初始猜测或输出示例"><button data-view="initial" aria-pressed="false">初始猜测</button><button data-view="result" aria-pressed="true">输出示例</button></div></div><div class="task-preview"><div id="task-scene"></div><div><label class="frame-slider">逐帧查看 <input id="task-frame" type="range" min="0" max="5" value="0"><output id="task-frame-label"></output></label><div id="task-frame-state"></div></div></div><div id="task-frames"></div><p class="legend"><span class="gold-text">◎ 已知起点</span><span class="red-text">× 位置估计</span><span>● 物理点</span><span>虚线：被遮挡点的教学参照</span></p><div id="task-readout" class="readout" aria-live="polite"></div><p class="caption">轨迹数值是预设教学示例，用于看清输入输出；浏览器不运行模型权重。</p>`)}
  <div class="flow-row">${flow('两个输入：Video + Query','一段视频 + 一个或多个已知起点。','gold')}${arrow}${flow('CoTracker3','寻找图像证据，联合迭代修正轨迹。')}${arrow}${flow('输出：每帧的状态','位置 P / 可见性 V / 置信度 C。','purple')}</div>
  ${panel('三个输出，分别回答三个问题',`<div class="definition-grid"><div><span class="definition-symbol">P</span><h3>这个点在哪里？</h3><p>${term('P','位置')}是二维坐标 (x, y)。每一帧都有一个估计，连起来就是轨迹。</p></div><div><span class="definition-symbol">V</span><h3>现在看得见吗？</h3><p>${term('V','可见性')}描述是否被挡住。第 3、4 帧看不到 A，但它仍是要追踪的目标。</p></div><div><span class="definition-symbol">C</span><h3>位置有多可信？</h3><p>${term('C','置信度')}衡量位置准确性的信心。看得见也可能定位错；看不见也仍会维护位置。</p></div></div><div class="comparison"><div><b>可见，但匹配到了错误纹理</b><p>V 可以较高，C 应较低。</p></div><div><b>遮挡中，但上下文支持某个位置</b><p>V 应较低，仍可以预测 P；C 不构成准确性保证。</p></div></div>`)}
  ${details('代码视角：张量与初始状态',`<p>B = 批量大小，T = 帧数，N = 点数。Video：[B,T,3,H,W]；queries：[B,N,3]；底层 P：[B,T,N,2]，V/C：[B,T,N]。</p><p>每个点的 query 坐标被复制到所有帧作为 P⁽⁰⁾。V/C 内部以零 ${term('logit')}初始化，所以转换成概率为 0.5。</p><p>底层返回 P/V/C；Offline 便捷 predictor 常用接口只返回轨迹和布尔可见性，Online 包装接口还用 V×C 判断可见标志。</p>${source('offline',132,'初始化')}${source('predictor',157,'包装接口')}`)}
  ${quiz('task')}${takeaway('CoTracker3 接收视频和已知起点，估计同一个点在各帧的位置、可见性和位置置信度。','先把整条数据流看一遍。')}`;
case 'architecture':return `
  <p class="lead">先记住四个动词：<b>猜位置 → 找证据 → 联合修正 → 用新位置再找证据。</b>下面这张总图就是整个模型。点击模块，右侧逐步解释它的输入、动作和输出。</p>
  <div class="architecture-layout"><section class="panel architecture-panel"><div class="panel-heading"><h2>完整推理数据流</h2><span class="badge">点击任一模块</span></div><div id="architecture-diagram"></div></section><section class="panel stage-panel"><p class="eyebrow">FOLLOW THE DATA</p><output id="stage-count"></output><h2 id="stage-title"></h2><dl id="stage-explanation"></dl><div class="controls"><button id="stage-prev">← 上一步</button><button id="stage-next" class="primary">下一步 →</button><button id="stage-return" class="quiet">回到高亮模块 ↑</button></div><div class="stage-dots" id="stage-dots"></div></section></div>
  ${panel('带着一个具体坐标走一轮',`<p>固定观察第 6 帧的 A：假设本轮位置是 (70, 110)，示意修正为 ΔP = (+163, −3)。以下把位置和增量都换算成像素，方便读图；网络内部以特征坐标计算。</p><div class="number-equation"><span>旧位置<b>(70, 110)</b></span><strong>+</strong><span>预测增量<b>(+163, −3)</b></span><strong>=</strong><span>新位置<b>(233, 107)</b></span></div><p>下一轮从 <b>(233, 107)</b> 附近重新取特征。Query 的参照位置保持不变。图像证据随采样中心改变，这就是闭环的意义。</p>`)}
  ${note('“迭代一轮”包含重新采样、相关性、token 构建、Transformer 和状态相加。Transformer 内的三组注意力是网络层次，两者不要混淆。')}
  <div class="sources">${reference(5,'Figure 2')}${source('offline',139,'完整迭代循环')}</div>
  ${takeaway('模型反复围绕当前猜测提取证据，联合预测增量，再用更新后的状态进入下一轮。','拆开“图像证据”来自哪里。')}`;
case 'features':return `
  <p class="lead">直接比 RGB 容易受光照和外观变化影响。CoTracker3 先用 <b>CNN 把每帧变成保留空间位置的特征图</b>。后面的匹配比较的是特征向量。</p>
  ${panel('一个格点，不只是一个颜色',`<div class="feature-layout"><div><div id="feature-scene"></div><p class="caption">原始 RGB 图像</p></div><div class="feature-example"><div id="feature-map"></div><p class="caption">特征图示意：颜色用于区分向量</p></div><div class="feature-vector"><span class="eyebrow">ONE LOCATION</span><h3>128 个数</h3><code>[0.3, −0.8, 0.1, …]</code><p>同一位置的纹理、结构等信息被编码成一个 ${term('feature','特征向量')}。这 128 个数由网络学习，示意颜色不是实际模型输出。</p></div></div>`)}
  ${panel('为什么保留四个尺度？',`<div class="controls"><div class="segmented scale-buttons" role="group" aria-label="特征尺度">${['1/4','1/8','1/16','1/32'].map((s,i)=>`<button data-scale="${i}" aria-pressed="${i===0}">${s}</button>`).join('')}</div></div><div class="two-column"><div id="scale-scene"></div><div><h3 id="scale-title"></h3><p id="scale-explanation"></p><div class="small-facts"><span>每个尺度都取 7×7 的邻域</span><span>尺度越粗，覆盖的原图范围越大</span></div></div></div><p>细尺度保留更细的定位证据；粗尺度能在当前猜测周围覆盖更大的范围。四者合用，但<b>这里没有先在整张图上寻找最大相似度的 global matching 阶段</b>。</p>`)}
  ${panel('随后分成两条采样路径',`<div class="comparison"><div><span class="badge gold">固定参照</span><h3>Query patch</h3><p>从参照帧的特征图，在已知 ${term('Query')} 周围取 ${term('patch','邻域')}。这个已知参照不随预测位置漂移。</p></div><div><span class="badge purple">每轮改变</span><h3>Current patch</h3><p>从当前帧的特征图，在本轮 P 周围取邻域。位置更新后，要重新采样。</p></div></div>`)}
  ${details('代码视角：尺度、缓存与连续坐标',`<p>fnet 为 BasicEncoder，输出通道 128、stride 4。基础特征归一化，再连续 2× average pooling 产生 H/4、H/8、H/16、H/32 四个空间分辨率。</p><p>一个 forward 内特征图和 Query 邻域可缓存；current 邻域按本轮坐标重新建立。内部 P 以 stride 4 的特征坐标表示，各尺度采样时再除以 2ˢ。</p><p>坐标可以位于格点之间：bilinear sampling 按相邻四格的距离插值取得向量，不是简单四舍五入。</p>${source('online',63,'fnet')}${source('offline',105,'特征金字塔')}${source('online',94,'邻域采样')}`)}
  ${takeaway('先把 RGB 变成四尺度特征，再取固定 Query 邻域和当前猜测附近的邻域。','两片邻域怎样变成匹配证据？')}`;
case 'correlation':return `
  <p class="lead">把两片邻域放在面前：左边是“已知点周围长什么样”，右边是“当前猜测周围长什么样”。<b>CoTracker3 把左边每个位置与右边每个位置都比较一次。</b></p>
  ${panel('从一对比较，到全部 81 对',`<p>为了看清关系，先画成 3×3。点击两边任一位置，或直接点下面的配对矩阵。</p><div class="patch-layout"><div><span class="badge gold">Query patch · 固定</span><div id="query-patch"></div><p>每格是一个 128 维向量</p></div><div class="pair-symbol">向量点积<br><b>↔</b><small>一个匹配分数</small></div><div><span class="badge green">Current patch · 随 P 改变</span><div id="current-patch"></div><p>每格是一个 128 维向量</p></div></div><div id="pair-readout" class="pair-readout" aria-live="polite"></div><div class="matrix-layout"><div id="pair-matrix"></div><div><h3>9 × 9 = 81 个配对</h3><p>矩阵的每一行是一个 Query 位置，每一列是一个 current 位置。选中一行，就能看到这个 Query 位置会与右边全部九格比较。</p><p>画成 9×9 矩阵方便观察，但每个值仍有 <b>(uq, vq, ut, vt)</b> 四个空间索引。</p><p class="caption">矩阵色深仅表示示意分数，不是对上方小车计算出的相似度。</p></div></div>`)}
  <div class="callout"><b>4D 的“四维”从哪里来？</b><p>Query 邻域有两个空间索引 (uq, vq)，current 邻域也有两个 (ut, vt)。合起来就是四维。<b>这里没有深度 z 这一维。</b></p></div>
  ${panel('实际模型：7×7 邻域，四个尺度',`<div class="flow-row">${flow('每个尺度','49 个 Query 位置 × 49 个 current 位置 = 2401 个点积值。','gold')}${arrow}${flow('共享 corr_mlp','2401 → 384 → 256；压缩原始匹配模式。','purple')}${arrow}${flow('四尺度拼接','4 × 256 = 1024 维，进入每个点每帧的 token。','purple')}</div><p>${term('correlation','相关性')}提供“当前猜测附近哪种对齐更合理”的证据；${term('MLP')}整理这些证据。<b>位置增量还需要后面的联合 Transformer 结合运动和上下文来预测。</b></p>`)}
  ${details('公式只表达一件事：比较两条特征向量',`<p class="formula">Corr(uq, vq, ut, vt) = ⟨Featureq(uq, vq), Featuret(ut, vt)⟩</p><p>尖括号是向量点积。完整张量还有批量 B、时间 T、点数 N 等外层维度；“4D”专指内部两个二维邻域的索引。图中矩阵把它们展开以便阅读。</p>${source('offline',154,'einsum 与 corr_volume')}${source('online',84,'corr_mlp 定义')}`)}
  ${quiz('correlation')}${takeaway('4D correlation 是两个二维局部邻域的全配对匹配；经过 MLP，它变成联合更新的证据。','Transformer 如何同时处理多帧、多点？')}`;
case 'joint':return `
  <p class="lead">只靠当前帧的匹配，遇到遮挡或重复纹理就容易不确定。联合 Transformer 把<b>同一个点的跨帧信息</b>和<b>同一帧里其他点的信息</b>结合起来。</p>
  ${panel('先明确：一个 token 装了什么？',`<div class="token-components"><div><b>匹配证据</b><span>1024 维</span><p>当前位置附近与 Query 的匹配模式</p></div><strong>+</strong><div><b>运动表示</b><span>84 维</span><p>当前轨迹相邻帧位移的 ${term('Fourier','Fourier 编码')}</p></div><strong>+</strong><div><b>当前 V / C</b><span>2 维</span><p>当前内部 logit 状态</p></div></div><div class="token-total">拼接 1110 维 + 时间编码 → 线性投影 → 384 维隐藏 ${term('token')}</div><p><b>一个 token = 一个点在一帧的状态。</b>6 帧 × 3 个点，就有 18 个真实轨迹 token。Transformer 不直接读 RGB，它读的是这张状态网格。</p>`)}
  ${panel('在“时间 × 点”的网格上，看信息走向',`<div class="controls"><div class="segmented" role="group" aria-label="注意力类型"><button data-attention="time" aria-pressed="true">时间注意力</button><button data-attention="group" aria-pressed="false">同帧跨点通信</button></div><span class="caption">点选 A / B / C 的任一格</span></div><div id="attention-grid"></div><div id="attention-readout" class="readout" aria-live="polite"></div><div id="proxy-explanation"></div>`)}
  ${panel('代理为什么能减少开销？',`<div class="flow-row">${flow('1. 代理读取真实点','同一帧的 A、B、C → 代理，汇集上下文。')}${arrow}${flow('2. 代理之间交流','代理 self-attention 整合汇集的信息。','purple')}${arrow}${flow('3. 真实点读取代理','把共同上下文写回 A、B、C。')}</div><p>官方使用 64 个可学习 ${term('proxy','代理 token')}。它们让真实点通过中间层交流，避免在所有真实点之间直接做完整两两空间注意力。代理也参与时间注意力，最终输出前会被去掉。</p><p>A、B、C 的运动可以互相提供线索；<b>网络并没有一条“同物体上的点必须同速”的硬规则</b>，也没有预先知道哪些点属于同一物体。</p>`)}
  ${details('不要混淆：网络深度、代理与辅助点',`<p>官方 updateformer 有三组“时间注意力 → 代理空间通信”。这三组网络层嵌在一次更新里，不等于三次完整追踪迭代。</p><p>${term('support','辅助点')}对应额外真实图像位置；proxy 是可学习的隐藏 token。一个用户 Query 也能通过辅助点获得多点上下文，辅助点预测在包装接口输出时去掉。</p><p>flow_head：384 → 2，预测 ΔP。vis_conf_head：384 → 2，预测 ΔV/ΔC。时间编码告诉网络帧顺序，motion 编码表达当前位移。</p>${source('transformer',387,'EfficientUpdateFormer')}${source('transformer',510,'代理读取和写回')}${source('offline',164,'motion 与 token')}`)}
  ${quiz('joint')}${takeaway('每个点每帧一个 token；沿时间整合自身信息，通过代理获得同帧其他点的上下文，再预测状态增量。','看这些增量如何闭环，并处理遮挡。')}`;
case 'refinement':return `
  <p class="lead">首次把 Query 坐标复制到各帧，当然可能猜错。网络不是一次就给出全部最终位置，而是<b>预测小步修正，再围绕新位置重新寻找证据</b>。</p>
  ${panel('移动采样中心，看匹配证据如何更新',`<div class="controls"><label>观察帧 <select id="refine-frame">${Array.from({length:6},(_,i)=>`<option value="${i}" ${i===5?'selected':''}>第 ${i+1} 帧${[2,3].includes(i)?' · 遮挡':''}</option>`).join('')}</select></label><label class="range-label">迭代 <input id="iteration" type="range" min="0" max="4" value="0"><output id="iteration-label">m = 0</output></label></div><div class="two-column refine-scenes"><div><span class="badge gold">固定参照 · Query</span><div id="refine-query"></div></div><div><span class="badge purple">当前帧 · 围绕 P 采样</span><div id="refine-current"></div></div></div><div id="refine-numbers" class="number-equation" aria-live="polite"></div><div class="cache-grid"><div><b>本轮保持</b><span>特征图 / Query patch</span></div><div><b>本轮重建</b><span>Current patch / correlation / motion</span></div><div><b>本轮更新</b><span>P / V / C</span></div></div><p class="caption">数值按预设比例接近物理参照，只用于展示采样中心的反馈。真实模型不保证每轮单调变好，局部搜索也可能失败。</p>`)}
  ${panel('看不见时，它靠什么继续？',`<div class="occlusion-story"><div><span>01 · 遮挡前</span><h3>图像匹配 + 运动上下文</h3><p>模型在可见帧中获得匹配证据，也建立当前轨迹的跨帧关系。</p></div><div><span>02 · 遮挡中</span><h3>联合上下文支持位置估计</h3><p>局部图像证据可能不可靠；时间信息和其他点的上下文参与预测，V 应降低。模型仍维护 P。</p></div><div><span>03 · 重新出现</span><h3>新图像证据参与修正</h3><p>新的局部匹配再次支持定位。Offline 还能利用后续帧信息，Online 受当前窗口上下文限制。</p></div></div><p>这不是手写的“速度不变 → 外推坐标”规则。遮挡处理仍由同一个经过训练的网络完成，可能漂移、定位失败或把点认错。</p>`)}
  ${details('代码视角：增量、概率与迭代次数',`<p class="formula">P ← P + ΔP　 Vlogit ← Vlogit + ΔV　 Clogit ← Clogit + ΔC</p><p>输出时坐标乘 stride 恢复像素单位，V/C 经 sigmoid 转成概率。模型 forward 默认 4 次迭代，官方便捷 predictor 调用 6 次；此处用 0–4 展示教学状态。</p>${source('offline',204,'增量相加')}${source('predictor',157,'predictor 的 iters')}`)}
  ${quiz('refinement')}${takeaway('新位置带来新的采样和匹配；遮挡时仍预测位置，但借助上下文不等于保证找对。','同一个核心，怎样处理短视频与长视频？')}`;
case 'modes':return `
  <p class="lead">两种版本都使用刚才那条<b>特征 → 局部相关性 → 联合更新 → 反馈</b>的核心。主要变化是一次处理的时间范围，以及窗口之间如何传递状态。</p>
  ${panel('Online：一段接一段，带着已有状态往前走',`<div class="controls"><div class="segmented" role="group" aria-label="滑动窗口">${[0,1,2].map(i=>`<button data-window="${i}" aria-pressed="${i===0}">窗口 ${i+1}</button>`).join('')}</div></div><div id="windows-diagram"></div><div id="window-readout" class="readout" aria-live="polite"></div><p class="legend"><span class="green-text">绿色：当前窗口</span><span class="gold-text">金色：继承上个窗口的重叠预测</span></p><p>常用 Online 配置：一次 16 帧，每次前进 8 帧。后一个窗口先继承重叠区的 P/V/C，新增帧从重叠末尾状态延展初始化，然后继续同样的更新循环。</p>`)}
  ${panel('Offline：把整段 clip 放进同一个时间网格',`<div class="offline-line"><span>遮挡前的帧</span><b>↔</b><span class="badge purple">Query 与遮挡帧</span><b>↔</b><span>重新出现的帧</span></div><p>整段 clip 的 token 一起参与更新。Query 位于中间帧时，也能追踪前后的帧。完整上下文通常更有利于处理遮挡，但占用内存随帧数与点数增加。</p><div class="comparison"><div><h3>Online：长流 / 滑动窗口</h3><p>整体向前处理，只利用已经送入当前窗口的帧；状态连接相邻窗口，适合更长的视频流。</p></div><div><h3>Offline：已获得完整 clip</h3><p>让整段上下文参与估计，适合录制完成的视频；长 clip 会受到内存限制。</p></div></div>`)}
  ${note('Online 的“整体向前处理”不等于窗口内每一帧都严格只看更早帧。官方时间注意力没有因此变成逐帧 causal attention；窗口内可使用一起送入的帧。')}
  ${details('代码视角：配置和训练区别',`<p>这里的 16/8 对应发布模型和 predictor 的常用配置，不是所有构造器唯一可用的窗长。两版共享 CoTrackerThreeBase。Offline 对可变长度插值时间编码；Online 的监督与状态衔接按滑动窗口组织。</p>${source('online',458,'窗口状态继承')}${source('offline',19,'整段 forward')}${source('build',7,'发布模型配置')}`)}
  ${takeaway('Online 用重叠窗口传递状态；Offline 用整段 clip 的上下文。匹配与联合迭代的核心相同。','这些预测能力是怎样训练出来的？')}`;
case 'training':return `
  <p class="lead">前面都是<b>推理：使用已学好的参数做预测</b>。现在换到训练：让网络通过轨迹监督学会提取证据和预测修正量。CoTracker3 先用合成数据，再用真实视频伪标签微调。</p>
  <div class="training-phases"><div><span class="badge">阶段 1</span><h2>合成视频预训练</h2><p>Kubric 渲染场景提供已知轨迹和可见性。位置预测用轨迹损失；V/C 用二分类监督，C 的目标由预测位置是否接近真值产生。</p></div><div><span class="badge gold">阶段 2</span><h2>真实视频微调</h2><p>真实场景更复杂，人工逐点标注昂贵。用已有 tracker 生成伪轨迹，让 student 在真实视频分布上继续学习。</p></div></div>
  ${panel('切换视图：训练中需要什么，推理中保留什么？',`<div class="controls"><div class="segmented" role="group" aria-label="训练与推理"><button data-training="train" aria-pressed="true">真实视频微调</button><button data-training="infer" aria-pressed="false">部署后的推理</button></div></div><div id="training-diagram"></div>`)}
  ${panel('多个教师，怎么给标签？',`<p>教师池包含 CoTracker3 Online / Offline、CoTracker2、TAPIR。<b>每个 batch 随机选一个冻结教师</b>，用同一份 Video 和 Q 生成当前伪轨迹。跨 batch 学习不同教师的优势，不是同一 batch 把四条轨迹平均。</p><div class="teacher-pool" id="teacher-pool"></div><div class="controls"><button id="next-batch" class="primary">模拟下一个 batch →</button><output id="batch-count"></output></div><p id="batch-readout" class="readout" aria-live="polite"></p><p class="caption">此按钮展示教师选择规则，不会运行教师模型。</p>`)}
  <div class="comparison"><div><h3>${term('SIFT')}做什么？</h3><p>真实训练时，SIFT 用来挑选相对适合追踪的 Query 起点。它不是 inference 的图像编码器：Video → 特征的路径始终由 CNN 负责。</p></div><div><h3>真实微调更新哪些参数？</h3><p>用教师轨迹监督位置。独立的 vis_conf_head 参数冻结，CNN、共享更新网络和位置头继续训练。不对 C/V 使用直接 BCE 监督。</p></div></div>
  ${details('实现边界：伪标签不是无误的真值',`<p>教师预测有噪声。真实数据帮助减小合成到真实的分布差异，不保证 student 在所有情况都优于教师。损失用教师 visibility 区分可见与遮挡轨迹的权重。</p><p>论文将轨迹损失写为紧凑 Huber 形式；固定代码的遮挡分支使用 L1。冻结 C/V head 只冻结该层参数，共享隐藏状态仍变化，所以 C/V 输出值并非恒定。</p><p>默认 SIFT sampler 在前 25% 时间抽 8 次帧；没有足够点的样本有效监督掩码为零。教师追踪辅助点提供上下文后，会把辅助预测从监督目标中去掉。</p>${source('real',106,'随机教师')}${source('real',53,'冻结 vis_conf_head')}${source('real',196,'真实轨迹监督')}${source('kubric',191,'合成监督')}${reference(14,'Figure 5 / 训练附录')}`)}
  ${quiz('training')}${takeaway('先用有真值的合成视频学会追踪，再用冻结教师给真实视频标轨迹；部署时只需训练好的 tracker。','用自己的话把完整架构串起来。')}`;
case 'recap':return `
  <p class="lead">如果能解释下面这条链，并说清反馈回到哪里，就掌握了架构主线。维度和实现细节用来核对，不需要先背住它们。</p>
  ${panel('一次推理，用六句话讲清',`<ol class="recap-chain"><li><b>拿到视频和 queries。</b><span>已知起点确定要追踪哪个点，初始位置复制到各帧。</span></li><li><b>CNN 提取四尺度特征。</b><span>为每帧建立可比较的空间表示，并缓存。</span></li><li><b>取两种局部邻域。</b><span>Query 邻域固定；current 邻域围绕当前 P 采样。</span></li><li><b>计算局部 4D correlation。</b><span>两个二维邻域全配对，MLP 压缩，四尺度拼接。</span></li><li><b>联合 Transformer 预测增量。</b><span>token 合并匹配、运动、V/C；时间注意力与代理通信融合上下文，两个头输出 ΔP 和 ΔV/ΔC。</span></li><li><b>旧状态加增量，再循环。</b><span>新 P 改变采样中心，新运动和 V/C 进入 token。迭代结束才得到最终像素轨迹与概率。</span></li></ol>`)}
  ${panel('用三个问题检验架构理解',`<div class="recap-prompts"><details><summary>去掉反馈回路，会失去什么？</summary><p>位置更新后无法用新中心取得新的匹配证据。迭代变成在旧证据上反复预测，失去“修正猜测 → 重查图像”的闭环。</p></details><details><summary>去掉跨点通信，模型还能做什么，会失去什么？</summary><p>仍能用自己的局部匹配和时间上下文追踪，但无法通过代理利用其他点的共同上下文。联合追踪的帮助尤其在遮挡和歧义时有意义。</p></details><details><summary>把教师塞进推理架构，哪里不对？</summary><p>教师用于训练阶段产生监督标签。推理时 student 的参数已经学好，直接由 Video / Q 运行追踪闭环。</p></details></div><div id="quiz-summary" class="readout"></div>`)}
  ${panel('CoTracker3 的变化，发生在哪些部位？',`<div class="comparison"><div><h3>推理结构更简洁</h3><p>使用局部 4D correlation + 简单 MLP；相较 CoTracker 的 token 构成更简化，V/C 随每轮状态一起更新；相较 TAPIR 等方法，省去 global matching 阶段。</p></div><div><h3>训练利用真实视频</h3><p>多种冻结教师跨 batch 提供伪标签，让简化后的 student 继续学习真实视频。结构变化与训练方案是两条贡献，不能只用“更换 backbone”解释。</p></div></div><p>本课讲的是 <b>CoTracker3</b>。原始 CoTracker / CoTracker2 的具体模块不同，不能把本课的 token 和 head 直接套到旧版本。</p>${reference(5,'§3.4 结构讨论')}`)}
  ${details('查看维度总表与官方代码定位',`<div class="table-scroll"><table><caption>默认实现，忽略批量 / 时间 / 点数的外层维度</caption><thead><tr><th>部位</th><th>实际尺寸 / 设置</th></tr></thead><tbody><tr><td>特征向量</td><td>128 维；四尺度 1/4、1/8、1/16、1/32</td></tr><tr><td>局部相关性</td><td>7×7×7×7 = 2401 / 尺度</td></tr><tr><td>corr_mlp</td><td>2401 → 384 → 256；四尺度拼接 1024</td></tr><tr><td>Token 输入</td><td>1024 + 84 + 2 = 1110；加时间编码后投影到 384</td></tr><tr><td>联合 Transformer</td><td>3 组时间 + 代理通信；64 个 virtual tracks</td></tr><tr><td>输出头</td><td>flow_head 384 → 2；vis_conf_head 384 → 2</td></tr><tr><td>迭代 / Online 窗口</td><td>forward 默认 4 次 / predictor 6 次；常用窗口 16、步长 8</td></tr></tbody></table></div><div class="table-scroll"><table><thead><tr><th>概念</th><th>官方源码</th></tr></thead><tbody>${mappings.map(([label,key,line,name])=>`<tr><td>${label}</td><td>${source(key,line,name)}</td></tr>`).join('')}</tbody></table></div>`)}
  <div class="source-footer"><p><b>可核对的来源</b> · 论文 arXiv:2410.11831v1；官方代码固定到 ${SHA.slice(0,8)}，2026-10-13 核对。</p><a href="https://arxiv.org/html/2410.11831v1" target="_blank" rel="noreferrer">论文全文 ↗</a><a href="https://github.com/facebookresearch/co-tracker/tree/${SHA}" target="_blank" rel="noreferrer">官方实现 ↗</a><p>所有场景、矩阵颜色和轨迹数值为教学示意。这里不加载权重，也不展示真实推理结果。</p></div>
  ${takeaway('固定参照 + 当前猜测 → 局部匹配 → 联合更新 → 重新采样。这条闭环就是 CoTracker3 的架构主线。')}`;
default:return '';
}}
