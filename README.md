# AI Visual Lab · 模型交互课堂

四个模型教学模块：Transformer、U-Net Attention、Depth Anything、CoTracker3。

统一首页在 `web/`，各模块的完整源码、依赖清单和锁文件位于 `modules/`。模块页面和所有运行资源一起构建到 `dist/`，不依赖原 ChatGPT Sites。

## 安装与构建

需要 Node.js 22。

```sh
npm ci --prefix modules/transformer
npm ci --prefix modules/attention
npm ci --prefix modules/depth
npm run build
npm run preview
```

本地预览地址为 `http://127.0.0.1:5197`。

## 发布

GitHub Pages 使用 GitHub Actions，向 `main` 提交后自动构建并发布 `dist/`。项目页面：`https://teamo-lemon.github.io/ai-visual-lab/`。

首页资源、模块入口与模块资源均采用相对路径，可部署在项目子目录或域名根目录。模块导航为 `#transformer`、`#attention`、`#depth`、`#cotracker`，可直接收藏或分享。

CoTracker3 是无需 JavaScript 的静态讲解页。用一张架构总图和四段解释讲清辨认线索、局部比较、前后帧与跨点信息、反复修正。移除动画、假轨迹计算、配对分数、答题计分和学习进度，只保留正文锚点与来源链接。详见 [模块说明](modules/cotracker/README.md)。

Depth Anything 以 V2 ViT-L 和 518×518 输入为统一例子，用五节串起任务、ViT 特征、DPT 多尺度融合、相对深度输出和 V1/V2 训练。移除了自动播放、模拟推理、图片上传和自测题库；只保留章节导航、融合步骤说明及按需展开的尺寸与源码。详见 [模块说明](modules/depth/README.md)。

其他模块的上传图片只在浏览器本地读取；架构、动画和数值示例用于教学。
