import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmt, getModel, tensors, type Config } from "./model";
import sources from "./code-map.json";
import {
  ScenePair,
  OverviewDiagram,
  EncoderDiagram,
  FusionDiagram,
} from "./Diagrams";

// One actual checkpoint configuration and input size throughout the lesson.
const config: Config = {
  mode: "real",
  version: "v2",
  size: "l",
  rawH: 518,
  rawW: 518,
  target: 518,
};
const model = getModel(config);
const data = tensors(config);
const chapters = [
  { id: "overview", title: "先看全貌", question: "一张照片，怎样变成深度图？" },
  {
    id: "encoder",
    title: "图像 → 特征",
    question: "ViT 看到了什么，又交出了什么？",
  },
  { id: "decoder", title: "特征 → 像素", question: "DPT 怎样把序列变回空间？" },
  { id: "output", title: "读懂深度图", question: "一个像素的预测值代表什么？" },
  { id: "training", title: "模型怎样学会", question: "V2 改进了什么？" },
];

function ChapterHeading({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <header className="lesson-heading">
      <span className="eyebrow">
        {String(index + 1).padStart(2, "0")} / {chapters[index].title}
      </span>
      <h1 id="lesson-title" tabIndex={-1}>
        {chapters[index].question}
      </h1>
      <p className="lead">{children}</p>
    </header>
  );
}
function Takeaway({ children }: { children: ReactNode }) {
  return (
    <aside className="takeaway">
      <span>带走这一句</span>
      <p>{children}</p>
    </aside>
  );
}
function Source({
  ids,
  children,
}: {
  ids: (keyof typeof sources)[];
  children?: ReactNode;
}) {
  return (
    <details className="source-detail">
      <summary>
        对照官方代码<span aria-hidden="true"> ↗</span>
      </summary>
      {children}
      {ids.map((id) => (
        <div className="code-source" key={id}>
          <a href={sources[id].url} target="_blank" rel="noreferrer">
            {sources[id].url.split("/").pop()?.split("#")[0]} · 第{" "}
            {sources[id].line} 行 ↗
          </a>
          <pre>
            <code>{sources[id].code}</code>
          </pre>
        </div>
      ))}
    </details>
  );
}
function Shape({ id }: { id: string }) {
  return <code className="shape">{fmt(data[id].shape)}</code>;
}

function Overview({ go }: { go: (index: number) => void }) {
  return (
    <>
      <ChapterHeading index={0}>
        Depth Anything 做的是<strong>单目深度估计</strong>：只看一张 RGB
        照片，为每个像素预测相对远近。先记住两件事：编码器理解图像，解码器把这种理解还原到像素位置。
      </ChapterHeading>
      <ScenePair />
      <section className="section">
        <div className="section-label">
          <h2>一张图看清架构</h2>
          <small>沿箭头读：图像 → 特征 → 深度</small>
        </div>
        <OverviewDiagram go={go} />
      </section>
      <div className="two-notes">
        <section>
          <h2>为什么不能只用 ViT？</h2>
          <p>
            ViT
            输出的是一组描述图像的特征向量，既不是像素图，也没有直接给出深度。还需要一个面向密集预测的解码器，把特征变成“每个位置一个值”。
          </p>
        </section>
        <section>
          <h2>DINOv2 和 DPT 各是什么？</h2>
          <p>
            <strong>DINOv2</strong> 提供预训练的 ViT 视觉编码器；
            <strong>DPT</strong>（Dense Prediction
            Transformer）是这里使用的解码结构，负责组织多尺度特征、融合信息、预测深度。
          </p>
        </section>
      </div>
      <Takeaway>
        照片先被编码成特征，再由 DPT 解码成深度图。理解架构，就追踪这两次转换。
      </Takeaway>
    </>
  );
}

function Encoder() {
  return (
    <>
      <ChapterHeading index={1}>
        用同一个真实例子贯穿本节：<strong>V2 · ViT-L，输入 518 × 518</strong>
        。token 是一个图像块的特征向量；1024 是向量的长度，不是像素数。
      </ChapterHeading>
      <section className="section">
        <h2>
          <span className="step-number">1</span>把图像块写成向量
        </h2>
        <div className="patch-flow">
          <div>
            <div className="patch-grid" aria-hidden="true" />
            <strong>518 × 518 RGB</strong>
            <span>每块 14 × 14 像素</span>
          </div>
          <span className="flow-arrow" aria-hidden="true">
            →
          </span>
          <div className="patch-math">
            <strong>37 × 37 = 1369 块</strong>
            <span>每块的 14 × 14 × 3 个颜色数</span>
            <span>经过同一组可学习的投影</span>
          </div>
          <span className="flow-arrow" aria-hidden="true">
            →
          </span>
          <div className="token-result">
            <span className="token-lines" aria-hidden="true">
              ▰ ▰ ▰ ▰ ▰<br />▰ ▰ ▰ ▰ ▰<br />▰ ▰ ▰ ▰ ▰
            </span>
            <strong>1369 个 tokens</strong>
            <span>每个 token 有 1024 维</span>
          </div>
        </div>
        <p>
          官方用一个核大小和步长都为 14
          的卷积完成切块与投影，然后展平空间维度。一个 token 对应一个 patch
          的位置；它的 1024 个数共同描述特征，没有“第 1
          维就是颜色”这样的固定分工。
        </p>
        <details className="extra">
          <summary>输入一定是正方形吗？这几个维度怎么读？</summary>
          <p>
            不一定。预处理大体保持宽高比，并把高、宽调整为 14 的倍数。518 × 518
            只是本课统一使用的例子。像素值还会除以 255，再按 ImageNet
            均值和标准差归一化。
          </p>
          <p>
            <code>[1, 1369, 1024]</code> 依次表示：1 张图、1369 个位置、每个位置
            1024 维特征。换成二维特征图后，<code>[1, 1024, 37, 37]</code>{" "}
            表示：1 张图、1024 个通道、37 行、37 列。
          </p>
        </details>
      </section>
      <section className="section">
        <h2>
          <span className="step-number">2</span>在同一张网格上，反复更新特征
        </h2>
        <p>
          先加入一个用于全局表示的 CLS token，再为序列加入位置编码，让模型区分各个图像块的位置。
          序列变成 <code>1370 × 1024</code>，经过 24 个 Transformer
          blocks。
        </p>
        <div className="block-explanation">
          <div>
            <span className="mini-label">每个 BLOCK</span>
            <strong>Attention：位置之间交流</strong>
            <p>
              一个位置根据其他位置的信息更新自己，例如结合地面、物体边缘和场景布局。
            </p>
          </div>
          <span className="flow-arrow" aria-hidden="true">
            →
          </span>
          <div>
            <span className="mini-label">每个 BLOCK</span>
            <strong>MLP：加工每个位置的特征</strong>
            <p>
              对每个位置的向量做非线性变换。这两部分各有残差连接，保留并更新原有信息。
            </p>
          </div>
        </div>
        <p className="note">
          特征内容一直在变，token 数量和向量长度不变。这里没有 CNN
          那样逐层缩小的空间网格。
        </p>
      </section>
      <section className="section">
        <h2>
          <span className="step-number">3</span>
          从一个编码器中，取出四个阶段的结果
        </h2>
        <EncoderDiagram />
        <p>
          V2 ViT-L 在第 <strong>5、12、18、24</strong> 个 block
          后各取一次特征（代码索引 4、11、17、23）。每组都经过 LayerNorm，并分离
          CLS；默认 DPT 只使用 patch tokens。
        </p>
        <p>
          <strong>F1～F4 是同一次前向传播的四个中间结果。</strong>
          它们的处理深度不同，但都是 1369 个位置、每个位置 1024
          维。保留多个阶段，能让解码器结合不同层次的视觉信息；这些阶段没有固定的“边缘层”“语义层”标签。
        </p>
      </section>
      <Takeaway>
        编码器交出四组同样大小的特征。它们还不是深度，也还不是四种空间尺度。
      </Takeaway>
      <Source ids={["patch", "token", "extract"]} />
    </>
  );
}

function Decoder() {
  return (
    <>
      <ChapterHeading index={2}>
        DPT 接到的是四组特征序列。它依次做三件事：
        <strong>恢复二维排列 → 建立不同尺度 → 从粗到细融合</strong>
        。这一节是理解整套架构的关键。
      </ChapterHeading>
      <section className="section">
        <h2>
          <span className="step-number">1</span>先找回位置，再建立尺度
        </h2>
        <p>
          每组 <code>1369 × 1024</code> 的序列，都按原来的 patch 顺序排回{" "}
          <code>1024 × 37 × 37</code>。这一步只是重排，恢复的是位置布局；经过
          Attention 后，某个位置的特征已经包含其他位置的信息。
        </p>
        <div className="reassembly">
          <div className="reassembly-label">
            <strong>四组输入，全是 37 × 37</strong>
            <span>各自经过 1×1 卷积调整通道，再进行空间采样</span>
          </div>
          <div className="scale-branches">
            {[1, 2, 3, 4].map((j) => (
              <div className={`scale-branch branch-${j}`} key={j}>
                <b>F{j}</b>
                <div
                  className="grid-size"
                  style={{
                    width: [88, 66, 44, 28][j - 1],
                    height: [88, 66, 44, 28][j - 1],
                  }}
                  aria-hidden="true"
                />
                <strong>
                  {data[`resize${j}`].shape[2]} × {data[`resize${j}`].shape[3]}
                </strong>
                <span>
                  {
                    [
                      "转置卷积 ×4",
                      "转置卷积 ×2",
                      "保持尺寸",
                      "步长为 2 的卷积",
                    ][j - 1]
                  }
                </span>
              </div>
            ))}
          </div>
          <div className="reassembly-label bottom">
            <strong>再用 3×3 卷积，把四路通道都对齐到 256</strong>
            <span>空间尺寸各不同，通道数相同，为逐级相加做好准备</span>
          </div>
        </div>
        <p>
          <strong>为什么要这一步？</strong>普通 ViT 没有天然的多尺度金字塔。DPT
          主动把四组同尺度特征组织成由粗到细的网格，方便后续逐级恢复空间结构。放大网格本身不会凭空产生细节，还要靠学习到的特征与融合。
        </p>
        <details className="extra">
          <summary>查看每条分支的完整尺寸</summary>
          <div
            className="table-scroll"
            role="region"
            aria-label="四条分支的形状"
            tabIndex={0}
          >
            <table>
              <caption>
                格式为 [batch, 通道, 高, 宽]；重排后的四路均为 [1, 1024, 37, 37]
              </caption>
              <thead>
                <tr>
                  <th>分支</th>
                  <th>1×1 通道投影后</th>
                  <th>空间采样后</th>
                  <th>3×3 通道对齐后</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((j) => (
                  <tr key={j}>
                    <th>F{j}</th>
                    <td>
                      <Shape id={`project${j}`} />
                    </td>
                    <td>
                      <Shape id={`resize${j}`} />
                    </td>
                    <td>
                      <Shape id={`scratch${j}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            F4 的卷积把 37 变成 19，不能简单写成 18.5 或
            18。稍后融合模块会明确插值到 37 × 37，和 F3 对齐。
          </p>
        </details>
      </section>
      <section className="section">
        <h2>
          <span className="step-number">2</span>从 F4 出发，把其他三路逐级接回来
        </h2>
        <p>
          主路从最小网格开始。每遇到一条对应分支，就把它的特征并入主路，再放大到下一条分支的网格尺寸。旁路保留下来的特征，通常叫{" "}
          <strong>skip connection（跳跃连接）</strong>。
        </p>
        <FusionDiagram />
        <div className="fusion-rule">
          <strong>一次有 skip 的融合，内部做什么？</strong>
          <p>
            <code>主路 + RCU(skip) → RCU → 插值放大 → 1×1 卷积</code>
          </p>
          <p>
            RCU 是残差卷积单元：两次 ReLU + 3×3
            卷积，再加回输入，用来细化局部特征。相加前，两路的高、宽和通道数必须相同。最初的
            Fusion 4 只有 F4 一个输入，因此没有 skip 相加。
          </p>
        </div>
      </section>
      <Takeaway>
        DPT 先把四组同尺度序列变成多尺度网格，再沿一条主路融合：19 → 37 → 74 →
        148 → 296。
      </Takeaway>
      <Source ids={["reshape", "fusion", "fusionInner"]} />
    </>
  );
}

function Output() {
  return (
    <>
      <ChapterHeading index={3}>
        DPT 融合后，仍是 <strong>256 个通道的特征图</strong>
        。预测头要把这些特征变成单通道：每个像素一个相对深度值。
      </ChapterHeading>
      <section className="section">
        <h2>最后一段：从特征到数值</h2>
        <ol className="head-flow">
          <li>
            <span className="step-number">1</span>
            <div>
              <strong>压缩特征通道</strong>
              <p>3×3 卷积：256 → 128 通道，网格保持 296 × 296。</p>
              <Shape id="head" />
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <strong>恢复到模型输入大小</strong>
              <p>双线性插值：296 × 296 → 518 × 518。只改变空间尺寸。</p>
              <Shape id="headUp" />
            </div>
          </li>
          <li>
            <span className="step-number">3</span>
            <div>
              <strong>预测每个位置的深度</strong>
              <p>
                3×3 卷积 + ReLU：128 → 32 通道；1×1 卷积 + ReLU：32 → 1 通道。
              </p>
              <Shape id="prediction" />
            </div>
          </li>
        </ol>
        <p>
          如果原图的尺寸不同，单图推理函数还会把结果插值回原图高、宽。最终得到一个二维数组，每个元素对应原图的一个像素。
        </p>
      </section>
      <section className="section">
        <h2>“更近、更远”和“多少米”是两回事</h2>
        <div className="depth-reading">
          <div className="depth-scale">
            <span>较远</span>
            <div aria-hidden="true" />
            <span>较近</span>
            <small>本课示意：亮度随预测值增大</small>
          </div>
          <div>
            <p>
              这里讲的是<strong>相对深度基础模型</strong>
              。它输出的值按相对逆深度理解，通常越大表示越近。颜色只是把数值映射成可见的灰度或色彩，不是模型预测的
              RGB 颜色。
            </p>
            <p>
              例如，同一张图里 A 的值是 0.8、B 是 0.3，可以用来判断 A 更近；
              <strong>不能读成 0.8 米与 0.3 米，也不能据此断言距离比。</strong>
              跨图片的数值也不能直接当作统一距离尺度。
            </p>
          </div>
        </div>
        <div className="two-notes">
          <section>
            <h3>为什么一张图难以确定米数？</h3>
            <p>
              一个小物体离得近和一个大物体离得远，可能形成相似的图像。网络依靠训练中学到的场景规律估计结构，单张照片本身无法唯一确定绝对尺度。
            </p>
          </section>
          <section>
            <h3>真的需要米制深度怎么办？</h3>
            <p>
              使用经过度量深度监督微调的 metric
              模型，并核对其适用场景和输出单位。给相对深度图换一条色带，不能把它变成米制测量。
            </p>
          </section>
        </div>
      </section>
      <Takeaway>
        输出是逐像素的相对远近。空间尺寸恢复了，不代表绝对距离也被恢复了。
      </Takeaway>
      <Source ids={["head", "headLayers", "output"]}>
        <p>
          <code>forward()</code> 去掉单通道轴，返回 [B, H, W]；
          <code>infer_image()</code> 再恢复原图尺寸，返回 [H₀, W₀]。
        </p>
      </Source>
    </>
  );
}

function Training({ go }: { go: (index: number) => void }) {
  return (
    <>
      <ChapterHeading index={4}>
        架构说明数据经过哪些计算；训练决定这些计算中的权重如何得到。
        <strong>
          DINOv2 提供视觉表征的起点，深度监督教会模型把表征变成远近关系。
        </strong>
      </ChapterHeading>
      <section className="section">
        <h2>V2 的训练路线</h2>
        <ol className="training-flow">
          <li>
            <span className="step-number">1</span>
            <div>
              <span className="mini-label">先训练教师</span>
              <h3>合成图像 + 准确深度</h3>
              <p>
                用 59.5 万张带深度标签的合成图像，训练以 DINOv2-Giant
                为骨干的大模型。合成数据可提供更干净的深度和细节监督。
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <span className="mini-label">把知识带到真实世界</span>
              <h3>教师给真实图像生成伪标签</h3>
              <p>
                让教师预测 6200
                多万张无标签真实图像的深度。“伪标签”就是模型生成的训练目标，不是传感器测量的真值。
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">3</span>
            <div>
              <span className="mini-label">训练最终学生</span>
              <h3>真实图像 + 教师的预测</h3>
              <p>
                学生模型在这些真实图像与伪深度标签上学习，让不同大小的模型获得面向真实场景的深度估计能力。
              </p>
            </div>
          </li>
        </ol>
        <p className="note">
          部署学生模型时，只运行一次“编码器 → DPT →
          深度图”。教师和伪标签生成流程属于训练阶段，不会在每次看图时重新执行。
        </p>
      </section>
      <section className="section">
        <h2>V1 → V2：骨架相近，训练路线改变</h2>
        <div
          className="table-scroll"
          role="region"
          aria-label="V1 与 V2 对比"
          tabIndex={0}
        >
          <table className="comparison">
            <caption>这里比较相对深度基础模型；抽取层以 ViT-L 为例</caption>
            <thead>
              <tr>
                <th>比较什么</th>
                <th>V1</th>
                <th>V2</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>推理骨架</th>
                <td>DINOv2 ViT + DPT</td>
                <td>DINOv2 ViT + DPT</td>
              </tr>
              <tr>
                <th>深度学习数据</th>
                <td>
                  约 150 万张有标签图像 + 6200
                  多万张无标签图像；结合伪标签、强数据增强与语义约束。
                </td>
                <td>合成数据训练大教师，再以真实图像及其伪标签训练学生。</td>
              </tr>
              <tr>
                <th>四层抽取位置</th>
                <td>最后四个 blocks：第 21、22、23、24 层。</td>
                <td>分布在不同深度：第 5、12、18、24 层。</td>
              </tr>
              <tr>
                <th>该如何理解提升</th>
                <td>用大规模数据扩展泛化能力。</td>
                <td>
                  更干净的监督、更强的教师和真实图像桥接共同作用；不能只归因于换了抽取层。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <Takeaway>
        用一句话复述：图像切成 tokens，ViT 抽出四层同尺度特征，DPT
        建立多尺度并逐级融合，预测头输出逐像素相对深度。权重来自训练阶段的深度监督。
      </Takeaway>
      <button className="text-button" onClick={() => go(0)}>
        带着这条主线，再看一次完整架构 ↗
      </button>
      <section className="references">
        <h2>继续读原始资料</h2>
        <p>
          架构尺寸按官方 V2 ViT-L
          实现，代码链接固定到已核对的提交。训练描述来自两版论文项目页。
        </p>
        <div>
          <a
            href="https://depth-anything-v2.github.io/"
            target="_blank"
            rel="noreferrer"
          >
            V2 论文与训练路线 ↗
          </a>
          <a
            href="https://depth-anything.github.io/"
            target="_blank"
            rel="noreferrer"
          >
            V1 论文与训练路线 ↗
          </a>
          <a href={sources.encoder.url} target="_blank" rel="noreferrer">
            V2 模型定义 ↗
          </a>
          <a href={sources.extractV1.url} target="_blank" rel="noreferrer">
            V1 四层抽取实现 ↗
          </a>
        </div>
      </section>
    </>
  );
}

function initialChapter() {
  const index = chapters.findIndex(
    (chapter) => `#${chapter.id}` === window.location.hash,
  );
  return Math.max(0, index);
}

export default function App() {
  const [chapter, setChapter] = useState(initialChapter);
  const lesson = useRef<HTMLElement>(null);
  const hasNavigated = useRef(false);
  useEffect(() => {
    const sync = () => {
      hasNavigated.current = true;
      setChapter(initialChapter());
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    document.title = `Depth Anything · ${chapters[chapter].title}`;
    if (hasNavigated.current) {
      window.scrollTo({ top: 0, behavior: "instant" });
      lesson.current
        ?.querySelector<HTMLElement>("#lesson-title")
        ?.focus({ preventScroll: true });
    }
  }, [chapter]);
  function go(index: number) {
    if (index === chapter) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    hasNavigated.current = true;
    window.location.hash = chapters[index].id;
    setChapter(index);
  }
  return (
    <div className="course-shell">
      <a
        className="skip-link"
        href="#lesson-title"
        onClick={(event) => {
          event.preventDefault();
          lesson.current?.querySelector<HTMLElement>("#lesson-title")?.focus();
        }}
      >
        跳到本节内容
      </a>
      <header className="topbar">
        <a
          className="brand"
          href="#overview"
          onClick={(event) => {
            event.preventDefault();
            go(0);
          }}
        >
          <span className="brand-symbol" aria-hidden="true">
            D<span>↗</span>
          </span>
          <span>
            Depth Anything<small>从图像到深度 · 架构课堂</small>
          </span>
        </a>
        <a
          className="repo-link"
          href="https://github.com/DepthAnything/Depth-Anything-V2"
          target="_blank"
          rel="noreferrer"
        >
          官方仓库 ↗
        </a>
      </header>
      <div className="course-layout">
        <aside className="sidebar">
          <span className="eyebrow">一条主线，五节讲清</span>
          <nav aria-label="课程章节">
            {chapters.map((item, index) => (
              <a
                href={`#${item.id}`}
                key={item.id}
                onClick={(event) => {
                  event.preventDefault();
                  go(index);
                }}
                aria-current={index === chapter ? "step" : undefined}
              >
                <span className="chapter-number">0{index + 1}</span>
                <span>{item.title}</span>
                <span className="nav-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </nav>
          <div className="lesson-context">
            <span className="mini-label">本课统一使用</span>
            <strong>Depth Anything V2</strong>
            <span>ViT-L · 相对深度基础模型</span>
            <div className="context-rule" />
            <span>
              输入{" "}
              <b>
                {model.h} × {model.w}
              </b>
            </span>
            <span>
              Patch <b>14 × 14</b>
            </span>
            <span>
              编码器 <b>24 blocks</b>
            </span>
          </div>
          <p className="sidebar-note">
            先理解每部分的职责，
            <br />
            需要时再展开尺寸和源码。
          </p>
        </aside>
        <main
          ref={lesson}
          className="lesson"
          aria-labelledby="lesson-title"
          key={chapter}
        >
          {chapter === 0 && <Overview go={go} />}
          {chapter === 1 && <Encoder />}
          {chapter === 2 && <Decoder />}
          {chapter === 3 && <Output />}
          {chapter === 4 && <Training go={go} />}
          <nav className="lesson-pagination" aria-label="前后章节">
            <div>
              {chapter > 0 && (
                <button onClick={() => go(chapter - 1)}>
                  <span>← 上一节</span>
                  <strong>{chapters[chapter - 1].title}</strong>
                </button>
              )}
            </div>
            <span className="page-count">
              {chapter + 1} / {chapters.length}
            </span>
            <div>
              {chapter < chapters.length - 1 ? (
                <button className="next-button" onClick={() => go(chapter + 1)}>
                  <span>下一节 →</span>
                  <strong>{chapters[chapter + 1].title}</strong>
                </button>
              ) : (
                <button onClick={() => go(0)}>
                  <span>回到开头 ↗</span>
                  <strong>再看全貌</strong>
                </button>
              )}
            </div>
          </nav>
          <footer className="lesson-footer">
            架构图与场景图用于讲解，页面不运行模型推理。
            <span>DEPTH ANYTHING / ARCHITECTURE NOTES</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
