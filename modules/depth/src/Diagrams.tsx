import { useState } from "react";

function Scene({ depth = false }: { depth?: boolean }) {
  return (
    <svg
      viewBox="0 0 340 170"
      role="img"
      aria-label={
        depth
          ? "相对深度示意：前方方块更亮，远处墙面更暗"
          : "场景示意：一个近处方块，一个远处方块，位于地面上"
      }
    >
      <rect
        width="340"
        height="170"
        rx="8"
        fill={depth ? "#283c3a" : "#d7e4df"}
      />
      <path d="M0 86H340V170H0Z" fill={depth ? "#607772" : "#e8dfcc"} />
      <path
        d="M0 170 125 86M340 170 215 86M90 170 150 86M250 170 190 86M0 118H340"
        fill="none"
        stroke={depth ? "#81948c" : "#c6bfaf"}
        strokeWidth="1"
      />
      <path
        d="M219 67 241 60 260 72 238 80Z"
        fill={depth ? "#7d9488" : "#8aa69a"}
      />
      <path
        d="M219 67 238 80V107L219 94Z"
        fill={depth ? "#7d9488" : "#466960"}
      />
      <path
        d="M238 80 260 72V98L238 107Z"
        fill={depth ? "#7d9488" : "#658e7a"}
      />
      <path
        d="M67 95 110 76 148 99 103 120Z"
        fill={depth ? "#e5eed2" : "#d6a575"}
      />
      <path
        d="M67 95 103 120V160L67 132Z"
        fill={depth ? "#e5eed2" : "#a76b44"}
      />
      <path
        d="M103 120 148 99V138L103 160Z"
        fill={depth ? "#e5eed2" : "#bd8757"}
      />
      <text
        x="25"
        y="26"
        fill={depth ? "#f4f8ee" : "#304e46"}
        fontSize="12"
        fontFamily="sans-serif"
      >
        {depth ? "每个位置一个值" : "每个位置 R / G / B 三个值"}
      </text>
      <text
        x="160"
        y="141"
        fill={depth ? "#f4f8ee" : "#304e46"}
        fontSize="12"
        fontFamily="sans-serif"
      >
        近
      </text>
      <text
        x="271"
        y="86"
        fill={depth ? "#f4f8ee" : "#304e46"}
        fontSize="12"
        fontFamily="sans-serif"
      >
        远
      </text>
    </svg>
  );
}

export function ScenePair() {
  return (
    <figure className="scene-pair">
      <div className="scene-comparison">
        <div>
          <div className="figure-label">
            <b>输入</b>
            <span>一张 RGB 图像</span>
          </div>
          <Scene />
        </div>
        <span className="scene-arrow" aria-hidden="true">
          →
        </span>
        <div>
          <div className="figure-label">
            <b>输出</b>
            <span>一张相对深度图</span>
          </div>
          <Scene depth />
        </div>
      </div>
      <figcaption>
        手绘任务示意，非模型预测。右图用亮表示近、暗表示远；模型预测的是数值，亮暗是显示方式。
      </figcaption>
    </figure>
  );
}

export function OverviewDiagram({ go }: { go: (index: number) => void }) {
  return (
    <div className="overview-diagram" aria-label="Depth Anything 完整架构">
      <div className="overview-input">
        <span className="mini-label">RGB 图像</span>
        <strong>518 × 518 × 3</strong>
        <span>预处理后的输入</span>
      </div>
      <span className="vertical-arrow" aria-hidden="true">
        ↓
      </span>
      <button className="overview-encoder" onClick={() => go(1)}>
        <span className="diagram-index">01 / ENCODER</span>
        <strong>DINOv2 · ViT-L</strong>
        <span>切块并投影 → 24 个 Transformer blocks</span>
        <small>
          从第 5、12、18、24 层取出特征 <b>查看内部 ↗</b>
        </small>
      </button>
      <div className="feature-taps" aria-label="四组特征各对应 37 乘 37 的 patch 网格">
        {[1, 2, 3, 4].map((j) => (
          <div key={j}>
            <span aria-hidden="true">↓</span>
            <b>F{j}</b>
            <span>37 × 37</span>
          </div>
        ))}
      </div>
      <div className="overview-decoder">
        <button className="decoder-heading" onClick={() => go(2)}>
          <span>
            <span className="diagram-index">02 / DECODER</span>
            <strong>DPT</strong>
          </span>
          <span>
            恢复网格 · 多尺度 · 融合 <b>查看内部 ↗</b>
          </span>
        </button>
        <div className="overview-scales">
          {[148, 74, 37, 19].map((size, i) => (
            <div key={size}>
              <span aria-hidden="true">↓</span>
              <span className="scale-box">
                {size} × {size}
              </span>
              <small>来自 F{i + 1}</small>
            </div>
          ))}
        </div>
        <div className="overview-fusion">
          <span>逐级融合</span>
          <strong>F4 → F3 → F2 → F1</strong>
          <span>得到 296 × 296 特征图</span>
        </div>
        <div className="overview-head">
          <span aria-hidden="true">↓</span>
          <strong>预测头：恢复尺寸，压成 1 通道</strong>
          <span>卷积 → 插值到 518 × 518 → 卷积</span>
        </div>
      </div>
      <span className="vertical-arrow" aria-hidden="true">
        ↓
      </span>
      <button className="overview-output" onClick={() => go(3)}>
        <strong>相对深度图</strong>
        <span>518 × 518 · 每像素一个值</span>
        <b>怎么读？ ↗</b>
      </button>
      <p className="diagram-note">
        F1～F4 此时仍是序列，图中按对应的 37 × 37 patch 网格表示，省略 batch
        和通道。四组特征来自一个 ViT，进入同一个 DPT。
      </p>
    </div>
  );
}

export function EncoderDiagram() {
  return (
    <figure className="encoder-diagram">
      <div className="encoder-start">
        <strong>1370 tokens × 1024 维</strong>
        <span>1369 个 patch tokens + 1 个 CLS</span>
      </div>
      <div className="encoder-taps">
        {[5, 12, 18, 24].map((block, i) => (
          <div className="encoder-tap" key={block}>
            <div className="block-range">
              <small>
                {i === 0 ? "第 1–5 层" : `第 ${[0, 6, 13, 19][i]}–${block} 层`}
              </small>
              <strong>Block {block}</strong>
              <span aria-hidden="true">↓</span>
            </div>
            <span className="tap-arrow" aria-hidden="true">
              →
            </span>
            <div className="extracted-feature">
              <strong>F{i + 1}</strong>
              <span>1369 × 1024</span>
            </div>
          </div>
        ))}
      </div>
      <figcaption>
        向下是同一个编码器的计算顺序；向右是取出中间特征。四路取出后都分离
        CLS，保留相同数量的 patch tokens。
      </figcaption>
    </figure>
  );
}

const fusionSteps = [
  {
    name: "Fusion 4",
    branch: "F4",
    input: "19 × 19",
    output: "37 × 37",
    explanation:
      "从 F4 开始，用残差卷积细化，再插值到 37 × 37。此时只有一路输入，没有 skip 相加。输出尺寸正好能接上 F3。",
  },
  {
    name: "Fusion 3",
    branch: "F3",
    input: "37 × 37",
    output: "74 × 74",
    explanation:
      "Fusion 4 的输出与 F3 都是 37 × 37、256 通道。先处理 F3，再与主路相加、细化，最后放大到 74 × 74，接上 F2。",
  },
  {
    name: "Fusion 2",
    branch: "F2",
    input: "74 × 74",
    output: "148 × 148",
    explanation:
      "Fusion 3 的输出与 F2 都是 74 × 74、256 通道。相加并细化后，放大到 148 × 148，接上 F1。",
  },
  {
    name: "Fusion 1",
    branch: "F1",
    input: "148 × 148",
    output: "296 × 296",
    explanation:
      "Fusion 2 的输出与 F1 都是 148 × 148、256 通道。完成最后一次 skip 融合，再放大到 296 × 296，交给深度预测头。",
  },
];

export function FusionDiagram() {
  const [selected, setSelected] = useState(1);
  const current = fusionSteps[selected];
  return (
    <figure className="fusion-diagram">
      <div className="section-label">
        <span>四次融合，一条主路</span>
        <small>点选一行，查看两路如何接上</small>
      </div>
      <div className="fusion-rows">
        {fusionSteps.map((step, i) => (
          <button
            key={step.name}
            className={`fusion-row ${selected === i ? "selected" : ""}`}
            onClick={() => setSelected(i)}
            aria-pressed={selected === i}
            aria-controls="fusion-explanation"
          >
            <span className="fusion-skip">
              <b>{step.branch}</b>
              <span>{step.input}</span>
              <small>{i === 0 ? "起点" : "skip"}</small>
            </span>
            <span className="tap-arrow" aria-hidden="true">
              →
            </span>
            <span className="fusion-operation">
              <strong>{step.name}</strong>
              <small>{i === 0 ? "细化 → 放大" : "相加 → 细化 → 放大"}</small>
            </span>
            <span className="fusion-out">
              <strong>{step.output}</strong>
              <small>{i === 3 ? "→ 预测头" : "↓ 进入下一行"}</small>
            </span>
          </button>
        ))}
      </div>
      <figcaption id="fusion-explanation" aria-live="polite">
        <strong>
          {current.name} · {current.input} → {current.output}
        </strong>
        <p>{current.explanation}</p>
      </figcaption>
    </figure>
  );
}
