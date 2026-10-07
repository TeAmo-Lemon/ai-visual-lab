# CoTracker3 架构课堂

来源：论文 [arXiv:2410.11831v1](https://arxiv.org/pdf/2410.11831) 与 [facebookresearch/co-tracker](https://github.com/facebookresearch/co-tracker/tree/82e02e8029753ad4ef13cf06be7f4fc5facdda4d)，代码固定为 `82e02e8029753ad4ef13cf06be7f4fc5facdda4d`（2026-10-07 核对）。课堂为独立静态页面，不依赖 ChatGPT Sites、外部 CDN 或模型权重。

## 核对范围

阅读论文 §3.1–3.4、Figure 2（PDF p5）、Figure 5（p14）、Figure 1（p1）、Table 3/5（p9）、Table 8（p15）与训练附录。

对照官方 `cotracker3_online.py`、`cotracker3_offline.py`、`cotracker.py` 中 EfficientUpdateFormer、`blocks.py` 中 BasicEncoder/Mlp、`model_utils.py`、`predictor.py`、`build_cotracker.py`、`losses.py`、`train_on_kubric.py`、`train_on_real_data.py` 及启动脚本。

关键边界：

- C/V 内部为 logit，零初始化经 sigmoid 为 0.5。最终模型输出概率；predictor 包装接口的布尔可见性与底层输出不同。
- CNN/pyramid 与 Query patch 缓存；current patch、correlation 与 motion 每轮从更新坐标重建。4 个尺度、7×7 实际 patch；图中的 3×3 仅解释四个空间索引。
- 共享 corr_mlp 2401→384→256，四尺度合并 1024；token 加 motion 84 与 C/V 2 共 1110，再加时间编码、投影到 384。
- 三组 temporal/group attention，64 proxies。空间通信实际为 proxies 读取 real→proxy self-attention→real 读取 proxies；并非完整 real-real spatial attention。
- Online 默认窗长 16 / step 8；重叠区继承 P/C/V，新增区延展重叠末尾状态。forward-only 不能等同于窗口内严格 causal attention。Offline 使用完整 clip，两者共享核心。
- 模型默认 4 次迭代，官方 predictor 调用 6 次。教学轨迹不保证真实模型单调接近真值。
- 每个 batch 随机一个冻结教师，不平均；教师池为 CoTracker3 Online/Offline、CoTracker（实现 CoTracker2）、TAPIR。辅助 support queries 的预测会从监督目标中去掉。
- 真实微调仅冻结 vis_conf_head 参数。共享网络与 flow_head 仍更新；冻结 head 输出值仍可因共享隐藏状态变化而改变。
- 真实阶段无直接 C/V BCE，但 teacher visibility 用于坐标损失。论文的紧凑 Huber 公式与代码遮挡 L1 分支不同，课堂辅助展开明确区分。
- 默认 SIFT sampler 在前 25% 时间随机抽样 8 次帧。SIFT 属于真实训练 query 采样，不是 inference feature extractor；无足够点的样本有效监督掩码为零。

## 验收问题 → 图解定位

| 用户问题编号 | 页面结构与交互 |
| --- | --- |
| 1–4 | 01 Video/Q 输入输出、可选 Query 帧、初始估计开关、P/C/V 三轴 |
| 5–6 | 02 fnet 展开、四尺度 pyramid、缓存与多尺度匹配路径 |
| 7–10 | 03 两 patch 数据来源、9×9 配对交互、四空间索引、MLP 数据流 |
| 11–12 | 02 token 汇合 + 04 相邻位移/Fourier 图，尺寸为辅助展开 |
| 13–15 | 04 Time×Points 网格切换列/行、真实→代理→真实通信 |
| 16–18 | 02 双 head、增量相加、反馈回路；03 每轮采样框移动 |
| 19–20 | 01 四状态图、遮挡序列；04 时间与联合轨迹上下文 |
| 21–23 | 07 三组旧结构→新结构比较，链接实际组件 |
| 24–26 | 05 共享核心、16/8 窗口继承、Query 前后上下文 |
| 27–31 | 06 domain gap、两阶段、教师/学生并行、随机 batch 教师池与历史 |
| 32 | 06 SIFT→Q 与 Video→fnet 并列，推理视图移除训练专属组件 |
| 33–34 | 06 合成 P/C/V 监督 vs 真实轨迹监督，明确可训练/冻结 head |
| 35–36 | 07 真实分布/多数据/多教师的训练关系、结构简化和消融证据 |
| 37–38 | 06 训练/推理切换保留 Video/Q 和已训练 Student，移除教师/SIFT/loss |
| 39 | 02 Figure 2 重构，固定 Query、变化 current、token 输入、输出与反馈 |
| 40 | 06 Figure 5 重构，单个随机教师和 student 的监督闭环 |

## 验证

`node --test modules/cotracker/state.test.js` 检查初始化、采样中心变化、81 个配对、时间身份与代理通信、8 帧窗口继承、单教师采样。所有图为原生 SVG / HTML，控件使用原生 button/select/details，字号 18px 起，宽图在小屏内局部滚动，不靠缩小文字塞内容。
