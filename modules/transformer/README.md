# Transformer Visual Lab

一个以真实矩阵计算驱动的 Transformer 交互式教学网站，React + TypeScript + Vite + SVG。

## 运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

生产构建与数学测试：

```sh
npm run build
npm test
npm run preview
```

## 已实现

- 完整 Encoder–Decoder 架构，真实 SVG 连线、端口、残差绕行、跨区域 K/V 路径。
- 24 步可独立检查的学习链路，前进、后退、自动播放、暂停、重置。
- 输入句子、简化 Tokenizer、Embedding 查表与缩放、正弦位置编码开关。
- Q/K/V 投影、点积、缩放、softmax 热力图、权重连线、Value 加权和。
- 两头四维 / 四头八维实验，整矩阵投影、Attention 矩阵运算、按列拼接与 Wₒ 输出投影。
- 原始 Transformer 的 Post-LN：Attention 后与 FFN 后的残差和 LayerNorm。
- 三层 Encoder，每层独立参数，按层检查注意力和输出。
- Decoder 前缀、因果 mask 开关、Cross-Attention 和三组残差。
- 四环节逐词生成：读前缀、提取最后一行、词表投影与选词、确认追加并重新计算；支持撤回和 EOS 停止。
- Decoder-only / GPT 因果结构示意（不含 Encoder 或 Cross-Attention）。
- Overview、Step-by-Step、Tensor View、可点击的 Math View ；张量列表按需展开。
- 教学尺寸与真实模型尺寸参考切换，响应式布局与减少动画偏好支持。

## 界面与操作

- 页面统一纵向滚动，目录、画布和矩阵均不设置独立滚动区。
- 16px 深色正文；删除首页宣传文案与重复状态说明。
- 章节目录按需展开，步骤菜单可直接跳转；上一/下一步定位到内容顶部。
- 宽矩阵和热力图按列分页，手机无需横向拖动数字表。
- 架构图可缩放并拖动查看，滚轮仍用于页面滚动。
- 删除右侧重复检查器；点击框图节点会定位已有矩阵，隐藏参数按需展开。
- 多头注意力用完整矩阵网格展示 XWq/XWk/XWv、QKᵀ、AV、Concat 与 Wₒ，仅显示矩阵尺寸。
- Concat 可自动演示或逐块拼入各头输出；颜色标记每个头占据的连续列，Wₒ 的对应行同步高亮。
- 投影和 Attention 通过 Head 按钮切换；拼接同时展示所有头，手机保持完整行列结构。
- 逐词生成可点击 Decoder 的各行，比较已知位置与待预测位置；矩阵图显示 h_last × W_vocab 的维度变化。
- 选词不自动追加；下一环节显示新旧前缀，并明确新增一个位置。每轮保存前缀、概率和 Decoder 计算快照，回放不会修改当前生成。
- 支持从 BOS 开始、编辑前缀、演示本轮、撤回和结束后逐轮回看。

## 教学边界

所有数值都由同一个确定性计算引擎产生。固定权重**未经训练**；没有外部模型 API，不宣称输出自然语言质量。分词采用简化词级规则，未知词 ID 是演示映射，可能碰撞，不等同于真实 tokenizer。

默认 d_model=4、heads=2、d_ff=8；可切换为 d_model=8、heads=4、d_ff=16。所有数值表省略 batch=1 维，完整符号 shape 在 Tensor View 展示。位置编码使用标准 sinusoidal 公式，词向量乘 √d_model。LayerNorm 采用 epsilon=1e-5、gamma=1、beta=0。FFN 使用 ReLU 与显式偏置。推理演示省略 dropout。

Real Model Mode 是尺寸参考（B=1、L=128、T=64、D=768、H=12、d_k=64、d_ff=3072、V=50257），不会伪装成已加载真实权重。其数值实验仍保持教学尺寸。

Decoder-only 展示 GPT 类因果结构；为对照学习使用一致的 Post-LN 排列，不等同于特定 GPT 检查点的完整实现。一次演示使用一个 Decoder block，Encoder 使用三个 block。生成每轮重新计算完整前缀，不实现 KV cache。

## 结构

- `src/engine.ts`：所有矩阵运算和前向计算。
- `src/engine.test.ts`：手算乘法、稳定 softmax、mask 泄漏、按行 LayerNorm、拼接、Cross K/V 来源、位置开关与 GPT 来源独立性等验证。
- `src/components.tsx`：SVG 节点/连线、矩阵、Heatmap。
- `src/MultiHeadLab.tsx`：多头矩阵运算、颜色对应与拼接演示。
- `src/GenerationLab.tsx`：逐词生成四环节、计算快照与历史回放。
- `src/lessons.ts`：24 步中文教学内容。
- `src/main.tsx`：交互状态、学习视图与生成循环。

架构参考：[Attention Is All You Need](https://arxiv.org/abs/1706.03762)。字体在网络可用时从 Google Fonts 加载，不可用时使用系统回退字体。
