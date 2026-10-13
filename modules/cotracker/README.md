# CoTracker3 · 从零看懂点追踪

独立 HTML / CSS / ES modules 教学页面，无运行库、CDN 或模型权重依赖。九章沿同一段六帧小车遮挡场景，先建立概念，再拆开数据流。

## 学习路径

1. **任务**：Video / Query 输入；位置、可见性、置信度输出。可选择参照帧和追踪点，切换初始化与输出示例，逐帧放大查看。
2. **架构**：可点击总图 + 六步“输入 / 动作 / 输出”解释；显式展示两条采样路径、token 汇合、两个 head、重新采样与状态反馈。
3. **特征**：RGB → 128 维向量；切换四尺度，观察同样 7×7 邻域覆盖的原图范围。
4. **相关性**：点选两片 3×3 教学邻域和 9×9 配对矩阵，区分四个空间索引；映射到实际 7×7×7×7 → MLP 的路径。
5. **联合更新**：选择点与帧，切换跨时间和同帧跨点通信；解释 1110 维输入、384 维隐藏状态、代理读取与写回。
6. **迭代 / 遮挡**：滑动迭代控件，显示固定 Query、变化的 current patch 和坐标增量；解释遮挡上下文与失败边界。
7. **运行方式**：切换 16/8 滑动窗口，看继承区与新增区；对照 Offline 整段上下文。
8. **训练**：切换训练 / 推理视图，随机演示每个 batch 只选一个教师；区分 SIFT 选点、CNN 提特征、参数冻结和伪轨迹监督。
9. **复述 / 查证**：六句话串起推理、解释反事实问题、区分结构与训练贡献；维度总表和固定源码链接。

五道理解检查提供原因反馈。原生 dialog 支持术语速查和 Escape 关闭；按钮状态、原生 select / range、焦点恢复支持键盘操作。章节浏览与作答保存到 localStorage，禁用存储时仍能使用课堂。旧 `#evidence` 书签映射到复述章节。

## 来源与事实边界

论文：[arXiv:2410.11831v1](https://arxiv.org/html/2410.11831v1)，尤其 §3.1–3.4、Figure 2、Figure 5 和训练附录。

官方实现：[facebookresearch/co-tracker](https://github.com/facebookresearch/co-tracker/tree/82e02e8029753ad4ef13cf06be7f4fc5facdda4d)，固定 SHA `82e02e8029753ad4ef13cf06be7f4fc5facdda4d`，2026-10-13 核对。页面的 `sources.js` 保存可查证的文件和行号。

- Feature maps 和固定 Query patch 可缓存；current patch、correlation、motion 每轮重建。
- 两个二维 patch 的空间索引组成局部 4D correlation；不是 x/y/z/time。实际每尺度 2401 个匹配值，共享 MLP 2401→384→256，四尺度合并 1024。
- 相邻位移 Fourier 表示 84 维，加 V/C 2 维组成 1110 维 token。加时间编码再投影到 384。三组注意力层不等于三次追踪迭代。
- 64 个 virtual tracks 是可学习隐藏 token，与额外真实图像 support points 不同。同帧通信为真实点→代理→代理自注意力→真实点。
- V/C 内部累加 logit，零初始化对应 sigmoid 概率 0.5。底层 P/V/C 与便捷 predictor 的返回接口有区别。
- Online 常用窗长 16、步长 8；整体 forward-only 不等于窗口内严格 causal attention。Offline 使用整段 clip。
- Model forward 默认 4 次迭代，官方 predictor 用 6 次。演示轨迹按预设比例接近参照，不代表真实模型会单调收敛。
- 每个 batch 一个随机冻结教师，不平均四个教师的预测。SIFT 用于真实训练的 query 采样，不是 inference encoder。
- 真实微调只冻结独立 vis_conf_head 参数，共享网络和位置头仍训练；共享表示变化仍会改变 V/C 输出。没有直接 C/V BCE，teacher visibility 参与轨迹损失。
- 论文轨迹损失的紧凑 Huber 表达与固定代码的遮挡 L1 分支区分说明。C 的合成标签为接近真值 12px，代码按 GT visibility 掩码。

## 开发与验证

`app.js` 管理交互，`lessons.js` 管理教学结构、术语和理解检查，`diagrams.js` 生成原生 SVG / HTML 图解，`state.js` 提供确定性的教学数据。根构建脚本将模块文件一起复制到 `dist/modules/cotracker/`。

```sh
node --test modules/cotracker/state.test.js
npm run build
npm run preview
```

状态测试检查各 Query 的初始化、采样中心、81 个配对及四索引、注意力身份与代理方向、token 尺寸、旧书签、8 帧窗口继承、单教师选择。浏览器验证应覆盖所有九章、控件状态、理解检查反馈、术语关闭与焦点、进度恢复、桌面及手机布局、首页 iframe 入口。
