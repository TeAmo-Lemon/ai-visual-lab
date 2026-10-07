import {source,reference,mappings,SHA} from './sources.js';
import {teacherForBatch,TEACHERS} from './state.js';
import {forwardOverview,taskFrames,stateQuadrants,refinementDiagram,patchDiagram,bilinearDiagram,tokenGrid,windowsDiagram,siftDiagram,batchDiagram} from './diagrams.js';

const arrow=(label='')=>`<div class="down-arrow" aria-hidden="true">↓${label?` <span>${label}</span>`:''}</div>`;
const node=(title,body,tone='feature')=>`<div class="node ${tone}"><b>${title}</b><p>${body}</p></div>`;
const detail=(title,body)=>`<details><summary>${title}</summary><div class="detail-body">${body}</div></details>`;
const context=(selected)=>`<div class="context-spine" aria-label="此模块在推理中的位置">${[['Video + Q','task'],['Features','architecture'],['局部匹配','correlation'],['联合更新','joint'],['重新采样','architecture']].map(([name,id],i)=>`${i?'<span aria-hidden="true">→</span>':''}<a href="#${id}" ${id===selected?'aria-current="location"':''}>${name}</a>`).join('')}</div>`;
const heading=(n,title,intro)=>`<div class="chapter-heading"><span class="chapter-number">${n}</span><div><h2>${title}</h2><p>${intro}</p></div></div>`;
document.getElementById('lesson').innerHTML=`
<section class="opening"><p class="eyebrow">论文架构理解 / 2024</p><h1>一个点，怎样在视频里<br>被逐轮找回来？</h1><p class="paper-title">CoTracker3: Simpler and Better Point Tracking<br class="desktop-only"> by Pseudo-Labelling Real Videos</p><p>先看完整的追踪闭环，再拆开局部匹配和联合更新。另一条训练路径解释：没有人工轨迹标签的真实视频，如何帮助同一个 tracker 学得更好。</p><div class="entry-links"><a href="#architecture">看模型完整 Forward →</a><a href="#training">看伪标签训练 →</a></div><p class="source-note">以论文原文与官方代码为依据。空间移动、颜色与小网格均为教学示意，不是浏览器中运行的模型预测。</p></section>

<section id="task">${heading('01','任务：追踪同一个物理点','Query 是用户给定的已知起点；其它帧的位置都是模型要估计的。')}
<div class="controls"><label>把已知 Query 放在 <select id="query-frame" aria-label="Query 所在帧"><option value="0">Frame 1</option><option value="1" selected>Frame 2</option><option value="3">Frame 4</option><option value="4">Frame 5</option></select></label><label class="toggle"><input id="initial-estimates" type="checkbox"> 显示初始估计 P⁽⁰⁾</label></div>
<p id="query-readout" class="query-readout"></p><div id="task-frames" class="video-strip"></div><p class="legend">● 物理点参照　<span class="query-text">◎ 已知 Query</span>　<span class="update-text">× 模型估计</span>。遮挡帧的虚线点只是教学参照，模型并不能直接看见它。</p>
<div class="io-flow">${node('输入','Video I₁ … Iₜ<br>Q = (tq, xq, yq)','query')}<span class="flow-arrow">→</span>${node('CoTracker3','估计同一个物理点的完整 trajectory','correlation')}<span class="flow-arrow">→</span>${node('每帧三个输出','P：位置　V：可见性　C：位置可靠性','update')}</div>
<div class="output-definitions"><p><b>Position P</b><br>这个点在当前帧的二维位置。被遮挡时仍维护预测位置。</p><p><b>Visibility V</b><br>这个点在当前图像里是否可见，回答“看得见吗”。</p><p><b>Confidence C</b><br>预测位置是否准确，回答“位置可信吗”。不是 visibility 的另一个名字。</p></div>
<div class="initialization">${node('已知 Query (tq, xq, yq)','只告诉模型一个时刻的位置；不是每帧的正确位置。','query')}${arrow('复制空间坐标到各帧')}${node('P₁⁽⁰⁾ = … = Pₜ⁽⁰⁾ = (xq, yq)','其它帧暂时都猜在相同坐标；后续迭代才逐渐移动。','update')}<p class="important">内部 C⁽⁰⁾ = V⁽⁰⁾ = 0 是 <b>logit</b>。sigmoid(0) = 0.5，不能把这里画成“初始概率为 0”。</p>${source('offline',132,'核对初始化代码')}
</div>
<h3>遮挡与不确定：两个不同轴</h3><div class="state-quadrants">${stateQuadrants()}</div><p>遮挡后的轨迹来自当前匹配证据与跨时间、跨轨迹上下文，并不是一条人工指定的运动规则。重新出现后，可见图像证据又能参与修正。图中的四种状态帮助区分概念；confidence 的校准仍受训练数据与监督范围影响。</p>
${detail('输出概率与官方接口的区别',`<p>循环内部累加的是 C/V logit，最终才用 sigmoid 得到概率。底层 CoTracker3 返回位置、visibility 和 confidence；常用 Offline predictor 包装接口返回 tracks 与 visibility，不直接返回 confidence。Online predictor 还会使用 visibility × confidence 决定对外的可见标志。学习结构时不要把包装接口的布尔值当成两个 head 的原始输出。</p>${source('predictor',157,'官方 predictor')}`)}
</section>

<section id="architecture">${heading('02','完整 Forward：猜测 → 匹配 → 修正 → 再匹配','Figure 2 的核心不是一条直线，而是使用新坐标重新采样的闭环。')}${context('architecture')}
<div class="overview-scroll">${forwardOverview()}</div><p class="legend">绿：图像特征 / 采样　紫：匹配与联合更新　赭黄：已知 Query　红棕：当前状态与反馈。右边回路更新采样位置，左边回路更新下一轮 token 的 C/V。</p>
<details class="forward-details"><summary>展开完整 Forward 的每根连接与模块内部</summary><div class="architecture-map" aria-label="CoTracker3 完整推理架构">
 <div class="io-flow">${node('Video Frames','I₁　I₂　…　Iₜ','feature')}<span class="flow-arrow">→</span><details class="node feature"><summary>Feature CNN / fnet</summary><div class="detail-body"><p>BasicEncoder 为每帧提取 dense learned features：RGB 像素 → feature vector。它学习可用于追踪的纹理与结构表示，比直接比较 RGB 更能适应外观变化；不是对光照、遮挡完全免疫。</p>${source('online',63,'BasicEncoder / fnet')}</div></details><span class="flow-arrow">→</span><div class="node feature"><b>4 个尺度的 Feature Maps</b><div class="pyramid"><span>细尺度 · 局部细节</span><i></i><i></i><i></i><i></i><span>粗尺度 · 更大范围上下文</span></div></div></div>
 <p class="cache-note">Feature CNN 每次 Forward 提取一次；多尺度 maps 被缓存。后面的每轮迭代重做局部采样与 correlation，不重跑整个 CNN。</p>
 <div class="iteration-loop">
  <div class="loop-title">重复的更新循环 · m = 0 … M−1</div>
  <div class="loop-return" aria-hidden="true"><span>↑</span></div>
  <div class="patch-branches"><div>${node('固定 Query Q','指定 query frame tq 和已知坐标 (xq, yq)','query')}${arrow('进入循环前：从缓存 maps 采样一次')}${node('固定 Query neighbourhood','Query 周围的 feature patch，整个迭代过程保持参照不变。','feature')}</div><div>${node('当前状态 P⁽ᵐ⁾ / C⁽ᵐ⁾ / V⁽ᵐ⁾','首轮从 Query 坐标与零 logit 初始化；之后来自上一轮更新。','update')}${arrow('P⁽ᵐ⁾ 指定本轮采样中心')}${node('Current track neighbourhood','每轮从缓存 maps：每帧、每尺度，在当前估计位置周围重新采样。','feature')}</div></div>
  <div class="merge-label">两组 neighbourhood 的全部位置两两比较 ↓</div>
  <details class="node correlation"><summary>Multi-scale 4D Correlation → MLP</summary><div class="detail-body"><p>两个 2D patch 形成四个空间索引的匹配 volume；MLP 将原始匹配模式压缩成 correlation features。四尺度的结果拼接。<a href="#correlation">展开邻域与 4D 结构 ↓</a></p>${source('offline',154,'correlation computation')}</div></details>
  ${arrow('图像匹配证据')}
  <div class="token-merge"><div class="node correlation"><b>Correlation features</b><p>当前猜测附近，哪里与 Query 更匹配？</p></div><span>+</span><div class="node update"><b>Motion Fourier embedding</b><p>P⁽ᵐ⁾ 的相邻帧位移关系</p></div><span>+</span><div class="node update"><b>C⁽ᵐ⁾ / V⁽ᵐ⁾</b><p>当前内部状态的 logit</p></div></div>
  ${arrow('拼接，并加时间编码')}${node('Track Token Gₜⁱ','每个 point i、每个 frame t 都有一个 token。','correlation')}${arrow()}
  <details class="node correlation"><summary>EfficientUpdateFormer · 联合 Transformer</summary><div class="detail-body"><p>时间注意力让同一个点跨帧交流；真实点通过 virtual / proxy tracks 在同一帧交流。Transformer 看的是 tracking tokens，不直接看 RGB。</p><a href="#joint">展开时间与代理通信 ↓</a>${source('transformer',387,'EfficientUpdateFormer')}</div></details>
  ${arrow()}<div class="split-heads">${node('flow_head','ΔP：二维位置增量','update')}${node('vis_conf_head','ΔV / ΔC：两个 logit 增量','update')}</div>${arrow('加到旧状态')}
  <div class="update-equations"><b>P⁽ᵐ⁺¹⁾ = P⁽ᵐ⁾ + ΔP</b><b>C⁽ᵐ⁺¹⁾ = C⁽ᵐ⁾ + ΔC</b><b>V⁽ᵐ⁺¹⁾ = V⁽ᵐ⁾ + ΔV</b></div>
  <div class="feedback-route"><b>↶ 下一轮的反馈</b><p><strong>新 P → 新采样中心 → 新 Correlation</strong><br>新 C/V → 下一轮 Track Token。上一轮的 correlation 不会原样复用。</p><a href="#correlation">看采样框如何随迭代移动 →</a></div>
 </div>${arrow('完成 M 次更新')}${node('Final Tracks / Confidence / Visibility','最终 P 转回像素坐标；C/V logit 经 sigmoid 转成概率。','update')}
</div></details>
<div class="source-row">${reference(5,'Figure 2 原图 / §3.1')}${source('offline',19,'一次完整 Offline.forward')}${source('online',42,'两种模式共享基类')}</div>
${detail('辅助：尺寸、尺度与迭代次数',`<p>Video：B × T × 3 × H × W。基础 feature 的空间步长为 4、通道 128；后续 2× average pooling 形成 1/4、1/8、1/16、1/32 四层。内部 P 使用基础 feature 坐标，输出再乘 stride。</p><p>官方 model.forward 默认 4 次迭代；便捷 predictor 调用 6 次。下面的 4 步空间例子只是为了观察采样位置变化，不是固定的真实收敛曲线。</p>${source('online',42,'尺度设置')}${source('predictor',157,'predictor 的 iters')}`)}
</section>

<section id="correlation">${heading('03','局部区域 ↔ 局部区域：4D 到底来自哪里','先看采样位置，再看两个 patch 的全体匹配。Correlation 是修正位置的证据，不是最终坐标。')}${context('correlation')}
<div class="controls"><span>观察一次更新后的采样</span><button id="iteration-prev" aria-label="上一轮">← 上一轮</button><output id="iteration-label" aria-live="polite">初始 m = 0</output><button id="iteration-next" aria-label="下一轮">下一轮 →</button><label>尺度 <select id="feature-scale"><option value="0">1 · 细</option><option value="1">2</option><option value="2">3</option><option value="3">4 · 粗</option></select></label></div>
<div id="refinement-diagram"></div><p class="example-note">教学示意：图中位置被安排为逐渐接近参照点，帮助理解反馈；实际网络预测不保证每轮都朝真值移动。尺度框的大小仅表示感受空间范围。</p>
<div class="sampling-relation"><div>${node('Query frame tq','在已知 Q 周围采样，作为固定参照。','query')}${arrow()}${node('Query feature patch','u_q × v_q：不只有中心 feature','feature')}</div><div class="pairwise-symbol">全部两两比较<br>↔</div><div>${node('Frame t','在本轮 Pₜ⁽ᵐ⁾ 周围重新采样。','update')}${arrow()}${node('Current feature patch','u_t × v_t：当前估计附近的区域','feature')}</div></div>
<h3>选择 Query patch 的一个位置，看它与哪些位置比较</h3><div class="patch-buttons" role="group" aria-label="Query patch 中的位置">${Array.from({length:9},(_,i)=>`<button data-query-cell="${i}" aria-pressed="${i===4}">${String.fromCharCode(65+i)}</button>`).join('')}</div><div class="diagram-scroll" id="patch-diagram"></div><p id="pair-readout" class="important"></p>
<div class="index-flow"><b>2D Query patch</b><span>×</span><b>2D Current patch</b><span>→</span><b>(u_q, v_q, u_t, v_t)</b></div><p class="important">“4D”来自两个二维 neighbourhood 的空间索引，<b>不是 x、y、z、time</b>。每个 Query 位置都与每个 current 位置比较；不是只做 center ↔ center。</p>
<div class="io-flow">${node('4D volume','原始局部匹配模式','correlation')}<span class="flow-arrow">→</span>${node('corr_mlp','投影 / 压缩匹配模式','correlation')}<span class="flow-arrow">→</span>${node('Correlation feature','紧凑表示 → Track Token → Transformer','correlation')}</div>
<p>如果当前估计偏右，而邻域左侧更像 Query，匹配模式就能提供“应该往左修正”的证据。MLP 负责把这些原始比较整理成 representation；真正的 ΔP 由联合更新网络结合运动、C/V 与其它轨迹共同预测。它不是把最大相关值直接当坐标。</p>
${detail('Bilinear Sampling：坐标不在整数格点怎么办？',`<div class="bilinear-layout">${bilinearDiagram()}<div><p>feature map 是离散格点，轨迹坐标是连续值。采样器根据相邻四格的距离，对 feature vector 插值。因此 P 落在格子之间，仍能获取该位置的 feature。</p><p>Query 和 current 的 support points 都围绕中心建立规则邻域，采样时可使用连续坐标。它不是把点简单取整到最近像素。</p>${source('online',94,'support points 与 bilinear sampler')}</div></div>`)}
${detail('辅助：实际 7×7 邻域、MLP 与相关公式',`<p>3×3 图只为清楚展示 pairwise 关系。官方 corr_radius = 3，所以实际每边为 7×7；一个尺度的 volume 有 7×7×7×7 = 2401 个匹配值。</p><p class="formula">Corr(uq,vq,ut,vt) = ⟨Φq(uq,vq), Φt(ut,vt)⟩</p><p>这表示两个 feature 向量的点积。代码先做 feature 归一化，再比较局部 patch。共享 corr_mlp：2401 → 384 → 256，4 个尺度输出合并成 1024 维。相比 LocoTrack 的专门 correlation processing，这里采用简单 MLP。</p>${source('online',84,'corr_mlp')}${source('offline',154,'einsum 对应四个索引')}${reference(5,'§3.1 correlation')}`)}
</section>

<section id="joint">${heading('04','Transformer：时间 × 轨迹的联合更新','每个 token 是一个点在一个时刻的 tracking state。多个点共同追踪，不是分别运行多个独立 tracker。')}${context('joint')}
<div class="motion-flow"><b>Pₜ₋₁</b><span>→ 位移 →</span><b>Pₜ</b><span>→ 位移 →</span><b>Pₜ₊₁</b></div><div class="io-flow">${node('相邻帧位移关系','当前估计轨迹的运动趋势','update')}<span class="flow-arrow">→</span>${node('Fourier encoding','把位移表示送进 token；不需要手算 sin / cos','update')}<span class="flow-arrow">→</span>${node('与 Corr、C、V 拼接','另加时间编码，保留帧顺序','correlation')}</div>
<div class="controls"><div class="segmented" role="group" aria-label="注意力关系"><button data-attention="time" aria-pressed="true">Time attention</button><button data-attention="group" aria-pressed="false">Cross-track / group</button></div><span>点击格子选择 Frame 与 Point</span></div><div class="diagram-scroll" id="token-grid"></div>
<div class="proxy-flow" id="proxy-flow">${node('Real tracks','同一帧中所有真实点的状态','feature')}<span class="flow-arrow">→<small>代理读取真实点</small></span>${node('Proxy / virtual tracks','汇集跨轨迹信息<br>代理之间 self-attention','correlation')}<span class="flow-arrow">→<small>真实点读取代理</small></span>${node('Real tracks','将共享上下文写回真实点','feature')}</div>
<p>代理避免真实点之间昂贵的完整两两空间注意力。实际顺序是：<b>real → proxy 读取 → proxy 自注意力 → real 写回</b>。代理还与真实点一起做时间注意力，然后输出前丢弃代理，只为真实点预测更新。</p>
<p>只有一个用户 Query 时，也可以通过辅助点提供 joint context。官方 Offline predictor 对显式 Query 默认追加 6×6 support grid，模型一起追踪，返回前再去掉辅助轨迹。<b>这些是额外的真实图像点；proxy 则是可学习 token，不对应用户指定的图像坐标。</b>论文评测使用的 support-point 配置与便捷 predictor 默认值也不完全相同。</p>${source('predictor',147,'support grid 的追加与丢弃')}
<div class="joint-example"><b>同一物体上的 A、B、C 一起移动</b><div class="motion-flow"><span>A 可见 →</span><span>B 被遮挡 ⇢</span><span>C 可见 →</span></div><p>A 与 C 的运动上下文可能帮助 B 保持合理轨迹；这是 joint tracking 的直觉，不是算法硬编码的“同物体点必须同运动”规则。</p></div>
<div class="update-structure">${node('输入投影 + 3 组更新','每组：时间注意力 → 通过代理进行空间交流','correlation')}${arrow()}<div class="split-heads">${node('flow_head','输出 ΔP，修改采样中心','update')}${node('vis_conf_head','输出 ΔV / ΔC，修改内部 logit','update')}</div>${arrow()}<div class="update-equations"><b>旧状态 + 增量 = 新状态</b></div><p class="feedback-route">↶ 新位置送回 <a href="#correlation">局部采样</a>，重新计算图像证据；新 C/V 送回 token。不是一次 Transformer 就输出全部最终绝对坐标。</p></div>
<div class="source-row">${source('transformer',387,'EfficientUpdateFormer')}${source('transformer',510,'代理读取与写回顺序')}${source('offline',164,'motion / token 构建')}</div>
${detail('辅助：输入 token 的尺寸与代码方向',`<p>Correlation 1024 + 双向相邻位移的 Fourier 表示 84 + C/V 2 = 1110。加上同维时间编码后，input_transform 投影到 384 维；隐藏网格为 Time × (Real Points + 64 Proxies) × 384。</p><p>代码的两组差分为 Pₜ − Pₜ₊₁ 与 Pₜ − Pₜ₋₁，边界补零，并按空间尺寸归一化。它表达当前运动状态；不需要为了理解结构展开三角函数数值。</p><p>注意 space_virtual2point_blocks 的名字：调用中 virtual 是 Query，point 是 Key/Value，因此信息先从真实点流向代理。这里按实际数据流画箭头。</p>${source('offline',164,'motion 编码')}${source('transformer',510,'实际 attention 调用')}`)}
</section>

<section id="modes">${heading('05','同一个核心结构，两种视频处理方式','Online / Offline 的差别在时间范围、窗口衔接与训练方式，不是两套无关 backbone。')}
<div class="shared-core">${node('共享核心','Feature CNN → local 4D correlation → MLP → joint Transformer → iterative P/C/V update','correlation')}</div>
<h3>Online：滑动窗口，继承重叠区的预测</h3><div class="controls"><label>观察窗口 <select id="online-window"><option value="0">1 · Frames 1–16</option><option value="1">2 · Frames 9–24</option><option value="2">3 · Frames 17–32</option><option value="3">4 · Frames 25–40</option></select></label><span class="legend-swatch">深绿：本窗　赭黄：继承区</span></div><div id="window-diagram"></div><p>Online 按时间向前处理，不能使用后面还没有到达的整段视频。这里的 forward-only 指 query 的追踪方向与窗口推进；<b>窗口内部的时间 attention 并不等同于逐帧严格 causal mask</b>。</p>
<h3>Offline：整段 clip，Query 前后共同参与</h3><div class="offline-timeline"><span>Past frames<br>过去的匹配与运动</span><b>←</b><span class="query-anchor">Query</span><b>→</b><span>Future frames<br>后续重新出现的证据</span></div><p>完整 clip 的 token 一起参与更新，可以借助 query 前后的上下文，帮助双向追踪与遮挡推断。它受显存与 clip 长度限制，不是无限长视频的全局处理器。</p>
<div class="source-row">${source('online',458,'overlap / copy_over')}${source('build',26,'默认窗口 16 的模型工厂')}${source('offline',19,'CoTrackerThreeOffline')}${reference(6,'§3.2 Online / Offline')}</div>
${detail('论文训练设置与当前实现，不要混成一个固定上限',`<p>论文预训练：Online 使用 64 帧 clip、16 帧窗口；Offline 随机 clip 长度 30–60，并对时间编码按长度插值。当前官方脚本也提供其它 clip 配置，60 不是“模型永远最多只能处理 60 帧”的硬上限。</p><p>Offline 可分块提取 CNN features 以控制特征提取的显存，但更新网络仍处理目标 clip 的时间关系；这与 Online 的窗口继承不同。</p>${reference(14,'Appendix A 训练设置')}${source('offline',19,'完整 clip 的更新')}`)}
</section>

<section id="training">${heading('06','为什么真实视频 + 伪标签能帮助同一个 tracker？','Figure 5 的训练关系单独呈现：SIFT、教师与损失属于训练；前面的 CoTracker3 才是真正推理时的网络。')}
<div class="domain-flow">${node('Synthetic Kubric','有精确的轨迹 / 可见性 Ground Truth','query')}<span class="flow-arrow">→<small>预训练</small></span>${node('初始 CoTracker3','学会追踪，但只接触合成分布','correlation')}<span class="flow-arrow">→<small>domain gap</small></span>${node('Real videos','真实纹理、运动、遮挡与成像分布不同','feature')}</div>
<h3>Stage 1：合成数据预训练</h3><div class="io-flow">${node('Kubric + Ground Truth','可靠的 P / V 标签，位置误差产生 C 的训练目标','query')}<span class="flow-arrow">→</span>${node('CoTracker3','轨迹损失 + visibility BCE + confidence BCE','correlation')}<span class="flow-arrow">→</span>${node('预训练权重','学生起点；教师池中的模型也先经合成数据训练','update')}</div>
<h3>Stage 2：真实视频伪标签微调</h3><div class="controls"><button id="next-batch">下一批真实视频 · 随机教师 →</button><button id="toggle-training" aria-pressed="false">只看推理时保留的组件</button></div>
<div id="training-flow" class="training-map">
 <div class="training-only"><div class="training-tag">仅训练</div>${node('Unlabelled real videos','没有人工轨迹标注；为当前 batch 选择 clip','feature')}${arrow()}<div id="sift-diagram"></div>${node('SIFT → Query Points','从抽样帧上的 feature points 选 Query；不是模型内部的 feature extractor。','query')}${arrow()}<div id="teacher-pool"></div></div>
 <div class="shared-input">${node('同一个 Real Video + 同一组 Query','教师与学生使用相同目标点，避免比较不同物理点的轨迹。','query')}</div>
 <div class="training-branches"><div class="training-only frozen-branch">${arrow()}<div class="node frozen"><b>Frozen Teacher</b><p id="chosen-teacher"></p><p>eval + no_grad<br>不更新、无 EMA 教师循环</p></div>${arrow()}${node('Pseudo tracks P*','教师生成伪轨迹；不是多教师输出平均。','frozen')}</div><div class="student-branch">${arrow()}<div class="node correlation"><b>Student CoTracker3</b><p>就是前面的 <a href="#architecture">完整 tracker 架构</a>。</p><div class="student-components"><span>fnet / corr_mlp / Transformer / flow_head<br><b>真实微调：可训练</b></span><span class="frozen-head">vis_conf_head<br><b>真实微调：参数冻结</b></span></div></div>${arrow()}${node('Student tracks P','同一组 Query 的预测位置','update')}</div></div>
 <div class="training-only loss-loop"><div class="merge-label">P* 与 P 在相同 frame / point 对齐 ↓</div>${node('Trajectory supervision','按 teacher visibility 区分监督权重；不计算 C/V 的直接监督 loss。','update')}${arrow()}<div class="feedback-route"><b>↶ 反向传播，仅更新 Student 的可训练参数</b><p>共享特征与更新网络、坐标 head 继续学习。教师与 vis_conf_head 的参数都不更新。</p></div></div>
 <div class="inference-result" hidden>${arrow()}${node('Inference 输出 P / C / V','输入仅 Video + Queries；不需要 SIFT、teacher 或 pseudo-label loss。','update')}</div>
</div><p id="training-view-note" class="important">图中赭黄分支为冻结教师，紫色为学生共享网络，红棕为位置更新。训练结束后，部署的是学生 CoTracker3。</p>
<h3>SIFT 与 Feature CNN：把位置采样和表示学习分开</h3><div class="scope-comparison"><div class="scope-training"><b>SIFT · 训练数据准备</b><p>真实视频里从哪里开始追踪？<br>选择有图像描述性的 Query points。</p><span>训练中：SIFT → Q → 教师 / 学生</span></div><div class="scope-inference"><b>Feature CNN · CoTracker3 内部</b><p>如何表示各帧的图像内容？<br>学习 dense tracking feature maps。</p><span>训练 / 推理中：Video → fnet → correlation</span></div></div>
<p>默认 SIFT sampler 在 clip 前 25% 时间范围随机抽样 8 次帧，再取 feature points。上图只画 3 帧和少量点帮助看清关系，未实际运行 SIFT。无足够候选的样本不会成为有效训练监督。</p>
<h3>Multi-teacher：每个 batch 一个，不是集体投票</h3><div id="batch-history" class="batch-history" aria-live="polite"></div><p>不同教师有不同处理方式与归纳偏置。学生在多个 batch 上接触来自不同教师的监督，可能整合它们的优势；同一个 batch 不将四条轨迹平均，也不保证学生必然胜过每个教师。</p>
<div class="source-row">${reference(14,'Figure 5 原图')}${reference(6,'§3.3–3.4 伪标签训练')}${source('real',106,'random.choice / no_grad')}${source('utils',55,'SIFT sampler')}${source('real',53,'冻结 vis_conf_head')}</div>
${detail('冻结 head 不等于冻结 C/V 的输出值',`<p>真实微调仅冻结名字含 vis_conf_head 的参数，整个 fnet、corr_mlp、共享 Transformer 与 flow_head 都仍可训练。冻结的 head 仍在每轮从共享隐藏状态生成 ΔC、ΔV；共享输入改变，输出值仍可能改变。</p><p>真实阶段不再计算 confidence / visibility 的直接 BCE；teacher visibility 仍参与轨迹损失的权重与掩码。不能说“没有任何 visibility 信息”，也不能说“整个网络继续训练”。</p>${source('real',53,'requires_grad = False')}${source('real',196,'真实数据坐标监督')}`)}
${detail('辅助：论文公式与官方训练代码的细节差异',`<p>论文 §3.3 用紧凑的 Huber 轨迹目标描述，迭代权重 γ = 0.8，遮挡权重约为可见点的 1/5。当前官方脚本的可见坐标分支使用 Huber，遮挡分支使用 L1，系数分别为 0.05 与 0.01；TAPIR teacher 或只训可见点的配置会跳过遮挡分支。</p><p>合成预训练还使用 C/V BCE。代码中 confidence 目标来自坐标误差是否在 12px 内，并按 GT visibility 掩码。真实数据的伪标签不提供同样可靠的 C/V 直接监督，因此采用冻结输出头的策略。</p><p>教师预测可追加辅助 support queries，它们帮助 joint tracking，但在生成目标标签后丢弃；图中“同一 Query”指教师和学生共享的监督目标点。</p>${source('real',196,'真实损失实现')}${source('loss',13,'sequence_loss')}${source('kubric',191,'合成预训练损失')}`)}
</section>

<section id="evidence">${heading('07','Simpler 与 Better：把贡献落到组件上','结构简化是一组明确选择；性能提升有实验支持，也有数据质量与配置边界。')}
<div class="comparison-paths"><div><h3>相比 CoTracker</h3><div class="old-path">Correlation + 学习的 track feature 更新<br>→ 后续可见性预测</div>${arrow()}<div class="new-path"><a href="#joint">Corr + motion + C/V → 联合增量更新</a><p>不再维护同样的迭代 latent track-feature updater；visibility 与坐标、confidence 一起迭代。</p></div></div><div><h3>相比 LocoTrack</h3><div class="old-path">局部 4D correlation<br>→ 专门的 correlation processing</div>${arrow()}<div class="new-path"><a href="#correlation">保留局部 4D → 简单 MLP</a><p>借鉴区域对区域的匹配证据，用更简单的投影整理。</p></div></div><div><h3>相比 TAPIR / BootsTAPIR / LocoTrack</h3><div class="old-path">Global matching + 局部更新</div>${arrow()}<div class="new-path"><a href="#architecture">多尺度局部匹配 + 联合迭代修正</a><p>CoTracker3 去掉 global matching module。这是作者的架构选择，不是“任何追踪任务永远不需要全局匹配”。</p></div></div></div>
<p>论文的 CoTracker3 约 25M 参数，CoTracker 约 45M。参数差异来自上述具体结构变化；“简化”还包括采用随机冻结教师与直接伪轨迹监督，避免复杂的教师更新流水线。</p>
<h3>为什么学生可能超过教师？</h3><div class="reason-flow"><span>真实视频分布<br>减少 synthetic → real gap</span><b>+</b><span>更多、多样的视频<br>学习跨样本规律</span><b>+</b><span>不同冻结教师<br>提供互补的监督</span><b>→</b><span>Student<br>泛化可能改善</span></div><p>学生训练的是大量真实样本上的规律，不是存储某一段教师输出。伪标签仍有噪声，教师质量、采样与数据分布会限制效果；“更强”是论文的实验结果，不是伪标签训练的保证。</p>
<div class="evidence-block"><h3>多教师与联合追踪：看具体实验</h3><div class="table-scroll"><table><caption>论文 Table 5：Online student 的 δavg（同一消融设置）</caption><thead><tr><th>监督策略</th><th>结果</th><th>图中对应位置</th></tr></thead><tbody><tr><td>仅合成数据</td><td>74.5</td><td>Stage 1</td></tr><tr><td>单个 Online CoTracker3 teacher</td><td>75.7</td><td>Stage 2 单教师</td></tr><tr><td>四教师随机采样</td><td>76.8</td><td>Stage 2 教师池</td></tr></tbody></table></div><p>Table 3 的 DynamicReplica 消融中，加入 cross-track attention 后：可见点 δavg 71.3 → 72.9，遮挡点 35.9 → 41.0。这支持保留联合交流；不是所有视频上的固定收益。</p>${reference(9,'Table 3 与 Table 5')}</div>
<h3>真实数据规模：先改善，再出现收益趋缓</h3><div class="scaling-axis"><span>0</span><span>100</span><span>1k</span><span>5k</span><span>15k</span><span>30k</span><span>100k</span></div><p>Figure 1 对这些真实训练视频数量进行实验；仅 100 个视频就有改善，CoTracker3 / LocoTrack 在约 30k 后收益趋于平缓。这里显示论文的规模设置，不编造一条精确分数曲线。数据量并非无限增长就必然继续提升。</p>${reference(1,'Figure 1 数据规模实验')}
${detail('随机选教师 vs 平均 / 中值：论文 Table 8',`<div class="table-scroll"><table><caption>δavg；同一数据集列中比较不同伪标签生成策略</caption><thead><tr><th>策略</th><th>Kinetics</th><th>DAVIS</th><th>RoboTAP</th><th>RGB-S</th></tr></thead><tbody><tr><td>Random teacher</td><td>68.2</td><td>77.0</td><td>78.8</td><td>83.3</td></tr><tr><td>Mean</td><td>67.4</td><td>76.5</td><td>77.9</td><td>82.4</td></tr><tr><td>Median</td><td>67.3</td><td>76.3</td><td>77.3</td><td>81.1</td></tr></tbody></table></div><p>随机教师是论文实际采用的训练策略；上述结果是这一配置的消融，不意味着所有 teacher ensemble 的平均方法都无效。</p>${reference(15,'Table 8 teacher aggregation')}`)}
<h3>贡献发生在哪里？</h3><div class="contribution-links"><a href="#correlation">局部 4D → 匹配模块</a><a href="#correlation">简单 MLP → 压缩模块</a><a href="#joint">联合 ΔP/ΔC/ΔV → 更新网络</a><a href="#architecture">去掉 global matching → 完整架构</a><a href="#training">随机教师 → 真实训练分支</a><a href="#training">SIFT → 训练 Query 准备</a><a href="#modes">Online / Offline → 时间处理方式</a></div>
<h3>读官方代码：从图定位实现</h3><p>以下链接固定到官方仓库版本 <code>${SHA.slice(0,12)}</code>，避免未来主分支变化造成图与代码失配。采用论文原文作为方法依据；实现细节注明代码与论文的区别。</p><div class="table-scroll"><table class="code-map"><thead><tr><th>图中组件</th><th>官方代码</th><th>阅读重点</th></tr></thead><tbody>${mappings.map(([concept,key,line,name,description])=>`<tr><td>${concept}</td><td>${source(key,line,name)}</td><td>${description}</td></tr>`).join('')}</tbody></table></div>
${detail('用图纠正八个常见误解',`<ul class="misconceptions"><li><a href="#architecture">每帧从全图搜索？</a>看当前估计如何决定局部采样中心。</li><li><a href="#correlation">4D 是 xyz + time？</a>看两套二维索引。</li><li><a href="#joint">Transformer 直接看 RGB？</a>看 token 的四路输入。</li><li><a href="#joint">每个点独立追踪？</a>看真实轨迹与代理的读写路径。</li><li><a href="#correlation">每轮复用 correlation？</a>切换迭代，观察采样区域移动。</li><li><a href="#modes">Online / Offline 是不同 backbone？</a>看共享核心和窗口继承。</li><li><a href="#training">SIFT 是推理 CNN？</a>切换“只看推理”，观察 SIFT 分支消失。</li><li><a href="#training">多个 teacher 取平均？</a>切换 batch，观察每批只启用一个冻结教师。</li></ul>`)}
</section>`;

let query=1,initial=false,iteration=0,scale=0,cell=4,attention='time',time=2,point=1,windowIndex=0,batch=1,teacher=teacherForBatch(),inferenceOnly=false;
const history=[];
const $=id=>document.getElementById(id);
function renderTask(){
 $('task-frames').innerHTML=taskFrames(query,initial);
 $('query-readout').innerHTML=`已知 Q 的 tq = Frame ${query+1}。${initial?'× 在各帧复制同一初始坐标；绿色 ● 是教学参照，不是初始化输入。':'除了指定的 Query，其它帧的绿色 ● 是教学参照，真实任务中需要模型预测。'}`;
}
function renderCorrelation(){
 $('refinement-diagram').innerHTML=refinementDiagram(iteration,query,scale);
 $('patch-diagram').innerHTML=patchDiagram(cell,iteration);
 $('pair-readout').innerHTML=`${String.fromCharCode(65+cell)} ↔ a … i：一个 Query 位置与 9 个 Current 位置比较。遍历 A … I，总计 9 × 9 = 81 个配对；这里只画关系，不展示数值矩阵。`;
 $('iteration-label').textContent=iteration===0?'初始 m = 0':`更新后 m = ${iteration}`;
 $('iteration-prev').disabled=iteration===0;$('iteration-next').disabled=iteration===4;
 document.querySelectorAll('[data-query-cell]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.queryCell)===cell));
}
function renderAttention(){
 $('token-grid').innerHTML=tokenGrid(attention,time,point);
 $('proxy-flow').classList.toggle('emphasized',attention==='group');
 document.querySelectorAll('[data-attention]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.attention===attention));
}
function renderBatch(){
 $('sift-diagram').innerHTML=siftDiagram(batch);$('teacher-pool').innerHTML=batchDiagram(teacher,batch);
 $('chosen-teacher').textContent=TEACHERS[teacher];history.push({batch,teacher});
 $('batch-history').innerHTML=history.slice(-6).map(x=>`<span>Batch ${x.batch} → <b>${TEACHERS[x.teacher]}</b></span>`).join('');
}
$('query-frame').addEventListener('change',event=>{query=Number(event.target.value);renderTask();renderCorrelation();});
$('initial-estimates').addEventListener('change',event=>{initial=event.target.checked;renderTask();});
$('iteration-prev').addEventListener('click',()=>{iteration=Math.max(0,iteration-1);renderCorrelation();});
$('iteration-next').addEventListener('click',()=>{iteration=Math.min(4,iteration+1);renderCorrelation();});
$('feature-scale').addEventListener('change',event=>{scale=Number(event.target.value);renderCorrelation();});
document.querySelector('.patch-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-query-cell]');if(button){cell=Number(button.dataset.queryCell);renderCorrelation();}});
document.querySelectorAll('[data-attention]').forEach(button=>button.addEventListener('click',()=>{attention=button.dataset.attention;renderAttention();}));
$('token-grid').addEventListener('click',event=>{const button=event.target.closest('[data-token-time]');if(button){time=Number(button.dataset.tokenTime);point=Number(button.dataset.tokenPoint);renderAttention();}});
$('online-window').addEventListener('change',event=>{windowIndex=Number(event.target.value);$('window-diagram').innerHTML=windowsDiagram(windowIndex);});
$('next-batch').addEventListener('click',()=>{batch++;teacher=teacherForBatch();renderBatch();});
$('toggle-training').addEventListener('click',()=>{
 inferenceOnly=!inferenceOnly;$('training-flow').classList.toggle('inference-only',inferenceOnly);
 $('toggle-training').setAttribute('aria-pressed',inferenceOnly);$('toggle-training').textContent=inferenceOnly?'返回完整伪标签训练图':'只看推理时保留的组件';
 $('next-batch').disabled=inferenceOnly;document.querySelector('.inference-result').hidden=!inferenceOnly;
 $('training-view-note').textContent=inferenceOnly?'推理时：输入 Video + Queries → Student 的已训练网络 → P/C/V。SIFT、教师、损失与冻结策略属于训练阶段。':'训练时：随机冻结教师生成 P*，student 预测 P，轨迹监督只更新 student 的可训练参数。';
});
renderTask();renderCorrelation();renderAttention();renderBatch();$('window-diagram').innerHTML=windowsDiagram(windowIndex);
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)document.querySelectorAll('.chapter-nav a').forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}},{rootMargin:'-20% 0px -65% 0px'});
document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));
