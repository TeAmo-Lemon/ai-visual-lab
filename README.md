# AI Visual Lab · 模型交互课堂

四个完整的交互教学模块：Transformer、U-Net Attention、Depth Anything、CoTracker3。

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

CoTracker3 为不依赖外部运行库的 HTML / CSS / ES modules 分步课堂，构建时一起复制，无需额外安装依赖。九章沿同一段遮挡视频解释任务、完整架构、特征、4D correlation、联合 Transformer、迭代、Online / Offline、训练和复述；配有术语速查、五道理解检查和本地学习进度。论文与官方代码核对说明见 [模块说明](modules/cotracker/README.md)。交互状态验证：`node --test modules/cotracker/state.test.js`。图像、匹配矩阵和数值均为教学示意，不运行模型权重。

Depth Anything 以 V2 ViT-L 和 518×518 输入为统一例子，用五节串起任务、ViT 特征、DPT 多尺度融合、相对深度输出和 V1/V2 训练。移除了自动播放、模拟推理、图片上传和自测题库；只保留章节导航、融合步骤说明及按需展开的尺寸与源码。详见 [模块说明](modules/depth/README.md)。

其他模块的上传图片只在浏览器本地读取；架构、动画和数值示例用于教学。
