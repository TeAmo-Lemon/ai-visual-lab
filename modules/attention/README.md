# Attention Lab

一个中文交互课堂，用逐步动画、可点击张量、矩阵热图和可核算数字解释 Latent Diffusion / Stable Diffusion 的 U-Net Attention。

## 启动

需要 Node.js 22.17 或更新版本。

```sh
npm install
npm run dev
```

浏览器打开终端打印的地址，默认 `http://127.0.0.1:5173/`。

```sh
npm test          # 数值与索引验证
npm run build    # TypeScript 检查与生产构建
npm run preview  # 预览 dist
```

已附带构建结果。也可以无需安装依赖，运行 `node serve.mjs`，打开 `http://127.0.0.1:5173/`。

## 如何学习

1. 首页点击 **U-Net**，查看 Down / Mid / Up 和 Skip；点击任意 Attention 进入同一个计算实验。
2. 左侧选择步骤，或底部逐步运行。方向键切换，空格自动播放/暂停。
3. 默认追踪左下角的图像 token #2；点击网格或修改 row/col。
4. 修改 Prompt 后点“应用”，或者用“换个例子”立即切换。Q 保持图像来源，文本 K/V、分数、权重和输出重新计算。
5. 第 7–9 步点热图行选择图像位置，点右侧条形行查看某个文本 token 的点积/概率。Softmax 沿 Key 轴，权重总和为 1。
6. 第 10 步点“演示逐项相加”，观察每项 `weight × V` 累积。
7. 第 12 步把计算后的向量还原到空间位置；第 13 步关闭残差，比较结果。
8. 查看完整 Transformer、Self/Cross 并排比较、多头拆分与拼接。
9. SD Shape 模式默认 row=10、col=15 → token #335（坐标从 0 开始）。点彩色 Tensor 查看右侧每一维。

## 模型与教学边界

- **教学模式**：2×2 空间位置、4 个 image tokens、3 个 text tokens、4 维。Wq/Wk/Wv/Wo 与运算真实执行。双头时真实拆为 2×2 维，独立缩放、Softmax、读取 Value，再 Concat 和 Wo。
- **SD Shape 模式**：工程 shape 显示 `[1,320,32,32]`、`[1,77,768]`，开启多头后 Q 为 `[1,8,1024,40]`。Single Head 是为理解计算提供的 320 维概念示意；SD 1.x 参考配置实际使用 8 heads。
- SD 画布的数字来自独立 **4 维 mock**，它们不是 320 维大张量的切片，也不是训练模型输出。数值缩放使用它们实际的 4 维；工程 8 头则使用 √40。网页始终分别标注二者。
- SD mock 保留 1024 个图像位置和 77 个上下文位置，热图采样显示部分行列；Softmax 仍使用所有 mock 上下文位置。特殊 token/PAD 的模拟不能代替 CLIP 的真实编码规则。
- Prompt 使用简单按词切分。教学模式选前 3 个非功能词，不足补空；`red/car/road` 的基向量是特意简化的例子。真实 CLIP 使用 BPE、位置编码与上下文表示，不是 one-hot。
- 未加载 VAE/CLIP/SD 权重，也不生成图片。Head 的不同分配是数值教学，不是预先定义的“颜色头/物体头”。
- 实验室是一条简化的 Attention 分支；完整 Transformer 页面补全 GroupNorm、1×1 Conv、三次 Pre-LayerNorm、Self/Cross Attention、GEGLU 和内部/外部残差。
- U-Net 图使用 256px 输入的分组尺寸示意，合并重复 ResNet 和部分 skip。所有 Attention 按钮进入默认的 320 通道实验，不将所点击分辨率自动代入实验。

## 项目结构

```text
src/App.tsx                     导航、播放、Prompt 与实验状态
src/components/Lab.tsx          13 步主线
src/components/FeatureMap.tsx   空间位置与序列映射
src/components/ProjectionStage.tsx  Q/K/V 投影与权重
src/components/TextStage.tsx     文本编码与 K/V 双路径
src/components/AttentionStage.tsx   点积、缩放、Softmax
src/components/OutputStage.tsx  加权求和、输出投影、残差
src/components/Inspector.tsx    张量维度检查
src/components/Overview.tsx     LDM 流程
src/components/UNet.tsx         分辨率与跳接
src/components/Transformer.tsx  完整 SpatialTransformer
src/components/DeepViews.tsx    Self/Cross 与多头
src/lib/math.ts                 独立数学运算
src/lib/math.test.ts            可核算样例与不变量验证
```

React + TypeScript + Vite；图表由 HTML/SVG 绘制，无静态架构图、外部字体或模型服务。

## 参考

- [CompVis Attention / SpatialTransformer 源码](https://github.com/CompVis/latent-diffusion/blob/main/ldm/modules/attention.py)
- [Stable Diffusion 1.x 推理配置](https://github.com/CompVis/stable-diffusion/blob/main/configs/stable-diffusion/v1-inference.yaml)

参考实现用于校对模块位置与工程维度；本项目使用自定义教学权重。
