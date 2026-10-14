# Depth Anything · 从图像到深度

围绕一条主线的中文架构课堂，使用 React、TypeScript、Vite 和静态 SVG/CSS 图示。固定用 V2 ViT-L、518×518 输入解释真实架构，避免在读者理解主线前引入大量配置。

## 五节课程

1. **先看全貌**：单目深度任务、DINOv2 与 DPT 的职责，以及可直接跳入对应章节的完整架构图。
2. **图像 → 特征**：patch 投影、token、位置编码与 CLS、Transformer 的职责、四层同尺度特征。
3. **特征 → 像素**：重排、通道投影、多尺度采样、通道对齐、Fusion 4→1；点击融合行查看输入和输出如何衔接。
4. **读懂深度图**：预测头、两次尺寸恢复、相对逆深度与米制深度的区别。
5. **模型怎样学会**：V2 的合成教师—真实伪标签—学生路线，以及 V1/V2 的架构和训练区别。

章节由 URL hash 定位，可刷新或使用浏览器前进/后退。按需展开尺寸表和官方代码，不设置播放、上传、模拟深度/Attention、题库或答题验证模块。页面不加载模型权重，不进行推理；手绘场景只说明任务。

## 开发与检查

```sh
npm ci
npm run dev
npm test
npm run build
```

根目录 `npm run build` 将四个模块构建到 `dist/` 并验证内部资源路径。`npm test` 保留实现层面的 shape 回归检查（42 组模型/宽高比组合、奇数网格、CLS 边界）；这些是开发检查，不是课堂内容。

浏览器检查范围：五节导航、刷新与历史、总览跳转、四次融合说明、尺寸与代码展开、桌面与移动端溢出、首页 iframe 集成。构建无需字体或图片 CDN。

## 官方依据

- [V2 实现](https://github.com/DepthAnything/Depth-Anything-V2/blob/a561b849ebae10a6f5ef49e26c83cbbcd36c71bf/depth_anything_v2/dpt.py)
- [V1 实现](https://github.com/LiheYoung/Depth-Anything/blob/1d03336771fe09c5398ffdd211441e33941a97dc/depth_anything/dpt.py)
- [V2 论文项目页](https://depth-anything-v2.github.io/)
- [V1 论文项目页](https://depth-anything.github.io/)

2026-10-14 重写时核对了上述固定版本的 V2 模型实现和两版论文项目页。`src/architecture.json` 与 `src/code-map.json` 保存原先提取的配置和固定提交代码片段；自动提取时间保留在数据文件中。`npm run sync:architecture` 可重新提取上游配置，但更换配置后也必须人工审阅课程中的示例文字和图示。

关键边界：四组特征的分辨率相同；多尺度由 DPT 建立；四路通道在 scratch 卷积后才统一到 256；最深分支为 37→19，Fusion 4 明确插值到 37；融合先同尺度相加再放大；Head 先 256→128，再插值到 518，最后 128→32→1；基础模型输出相对深度，颜色不代表米制单位。训练中的教师不属于学生的推理路径。
