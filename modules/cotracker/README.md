# CoTracker3 · 怎样追踪同一个点

单页 HTML / CSS 静态讲解，不依赖 JavaScript。所有内容直接可读，完整架构图不需要点击展开。

正文用四步讲清原理：CNN 提取辨认线索；保留起点参照并在各帧猜测位置附近比较；Transformer 参考前后帧和其他点；两个输出头给出修正，再到新位置重新寻找。Online / Offline 和训练各用一段补充。

移除上一版的动画与轨迹滑块、示意坐标计算、配对分数矩阵、随机教师演示、答题与计分、进度保存、术语弹窗及其状态代码。`index.html` 与 `style.css` 是全部运行资源；根构建脚本同时清除旧版 JS 资源。

来源：[CoTracker3 论文 v1](https://arxiv.org/html/2410.11831v1)，以及官方实现固定提交 [82e02e8](https://github.com/facebookresearch/co-tracker/tree/82e02e8029753ad4ef13cf06be7f4fc5facdda4d)。保留局部 4D correlation、MLP、tracking token、时间注意力、proxy 信息传递和两个输出头的事实关系，不在主文展示张量维度或虚构计算结果。

构建与预览沿用根目录的 `npm run build`、`npm run preview`。发布由 GitHub Pages 工作流完成；已删除仅服务于旧版演示状态的测试步骤，构建仍核验内部资源路径。
