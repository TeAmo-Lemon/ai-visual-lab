# Depth Anything Visual Lab

中文交互式教学网站，使用 React、TypeScript、Vite、SVG 与 Framer Motion。架构与 Tensor shape 来自官方源码；embedding、attention 与 depth 数值均为明确标注的教学模拟，不加载模型权重。

无需安装即可使用：双击交付的 `Depth-Anything-Visual-Lab.html`，用现代浏览器打开。它内置全部应用资源，离线可用；官方来源链接需要联网。

## 使用

```sh
npm install
npm run dev
```

打开终端显示的本地网址。构建静态网站：`npm run build`，产物为 `dist/`。

## 已实现

- 四组特征的完整并行路径，包含 reshape、projects、resize_layers、scratch、Fusion 4→1、Head 内部插值及原图恢复。
- 固定字号的 HTML 架构节点与 SVG 连线，形状使用 18px 等宽字；正文 17px，操作和输出形状更大。
- 连续 16 步，每一步明确输入、操作、输出；四条 skip 从此前步骤保留，不丢失上游来源。
- 当前 Tensor、逐轴数值、四条分支历史与可展开的官方短代码片段。
- 16 步播放、持续沿 SVG path 移动的数据点、模块展开和返回。
- Patch ↔ token 双向选择、patch 投影演示、token 飞回二维网格、逐尺度 resize 动画。
- Encoder 全部 blocks、显著的四条 extraction taps、Attention/MLP residual 结构、Fusion/RCU 内部结构。
- RGB/模拟深度 overlay、像素坐标反向路径、相对深度与米制深度区分。
- V1/V2 与模型 S/B/L/G（G 仅 V2）切换、CNN/ViT、独立训练视图、误区和 18 题自测。
- 本地图片读取；上传文件不会发送至任何服务器。模拟深度不代表上传照片的真实深度。

## 官方来源与更新

`src/architecture.json` 保存自动解析的 constants、核对时间及两版 commit SHA。`src/code-map.json` 保存从这些提交自动提取的片段。

```sh
npm run sync:architecture
```

脚本通过 GitHub 官方 API 下载 DPT、DINOv2、blocks、transform、run 与 README，提取 embedding dim、block/head 数、抽取层与 decoder channels。下载的核对源保存在 `scripts/official/`，不会打包进浏览器。若关键源码变化，脚本会报错，需人工检查后再更新。

来源：

- [V1 官方仓库](https://github.com/LiheYoung/Depth-Anything)
- [V2 官方仓库](https://github.com/DepthAnything/Depth-Anything-V2)
- [V1 训练说明](https://depth-anything.github.io/)
- [V2 训练说明](https://depth-anything-v2.github.io/)

## 准确性边界

- Real 遵循官方 lower_bound resize、保持宽高比、14 的倍数以及 NumPy ties-to-even 取整规则。
- Transformer sequence 包含 CLS（N+1），抽取的 patch features 不含 CLS（N）；默认 use_clstoken=False。
- projects 的四组输出 channels 可不同，scratch 的 3×3 卷积才统一 decoder channels。
- 最深 stride-2 Conv 使用 ceil，37→19；Fusion 4 显式回到 F3 的 37×37。
- Fusion 先处理 skip RCU、同尺度 Add、fused RCU，再插值与 1×1 Conv；Fusion 4 没有 skip Add。
- Head：D→D/2 的 3×3 Conv → 插值到模型输入 → D/2→32 的 3×3 Conv/ReLU → 32→1 的 1×1 Conv/ReLU。
- Head 输出 [B,1,H,W]，forward 返回 [B,H,W]，单图结果为 [H₀,W₀]。
- 教学模式为 56×56、4×4 patches、C=8、4 blocks 的 toy；不是官方 checkpoint。该模式保留官方 Head 的 32 个中间通道，因此并非每一步都减少 channels。
- 反向追踪展示几何对应与数据路径；卷积、插值和全局 attention 会混合其他位置，不是唯一来源或因果归因。
- Attention 为模拟 softmax；Feature 语义图是直觉示意。不能当成真实 attention/activation 解释。
- V1/V2 的差异并不只来自抽取位置；训练视图分别解释各版高层路线。

## 验证

```sh
npm test
node --import tsx scripts/check-interactions.tsx
npm run build
```

形状测试涵盖 42 组真实模型/宽高比组合、奇数尺寸、CLS 边界、toy mode 与所有分支 histories。React 组件测试在内存运行，不打开浏览器，检查全部 16 步、分支上游衔接、39 条架构连线和主要交互。重写版浏览器连接超时；实际桌面/移动端布局与浏览器动画尚未自动验收。
