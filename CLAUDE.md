# Particle Rose - 3D粒子玫瑰花

## 项目概述
单文件 HTML 应用，使用 Three.js 构建 5000 个粒子组成的 3D 玫瑰花。
支持 MediaPipe 手势识别交互和鼠标/触屏操控。
部署在 GitHub Pages (https://hvccj.github.io/particle-rose)。

## 技术栈
- Three.js 0.160 (CDN: cdn.jsdelivr.net)
- MediaPipe Hands 0.4 (手势识别)
- 纯静态 HTML/CSS/JS，无构建工具

## 文件结构
```
index.html          # 唯一源文件（CSS + JS 内联）
README.md
.github/workflows/deploy.yml  # GitHub Actions 自动部署到 Pages
```

## 关键架构
- 粒子总数: PARTICLE_COUNT = 5000
- 7 层花瓣 (LAYER_DEFS) + 花萼(350) + 花茎(350) + 叶片(2片各150)
- 粒子在 "玫瑰形态坐标" 和 "散开形态坐标" 之间插值
- convergeFactor: 初始动画进度 (0→1)
- spreadFactor: 手势控制的散开程度 (0=聚合, 1=散开)
- 手势: 握拳→聚拢, 张手→散开, 左右→旋转, 远近→缩放

## 关键函数
- generateRoseGeometry() — 生成玫瑰形态的粒子坐标和颜色
- generateScatteredPositions() — 生成散开形态坐标
- animate(timestamp) — 主渲染循环
- setupMediaPipe() — 摄像头和手势识别初始化
- createGlowTexture() — 粒子光晕纹理

## 已知注意事项
- 手势识别需要 HTTPS 或 localhost（摄像头权限）
- MediaPipe 模型文件（.tflite/.wasm）放在 jsDelivr CDN，国内加载需等待几秒
- 加载画面改为等待首帧渲染后消失（之前是固定 800ms）
- GitHub Pages 的 Source 必须设为 "GitHub Actions"

## Git 配置
- 仓库: https://github.com/hvccj/particle-rose
