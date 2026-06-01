# 🌹 粒子玫瑰花 — 3D Particle Rose

**5000个粒子构成的3D玫瑰花，支持手势识别交互和鼠标操控。**

[![Deploy to GitHub Pages](https://github.com/actions/workflows/deploy.yml/badge.svg)](../../actions)

## ✨ 特性

- **🎨 5000粒子高精度建模** — 7层花瓣 + 花萼 + 花茎 + 叶片，真实还原玫瑰形态
- **✋ 手势识别交互** — 基于 MediaPipe Hands，摄像头实时识别手势
  - 握拳/张手 → 粒子聚散为玫瑰花
  - 手掌左右移动 → 旋转视角
  - 手掌远近 → 画面缩放
- **🖱️ 鼠标/触屏支持** — 拖拽旋转、滚轮缩放，移动端完美适配
- **✨ 视觉特效** — 粒子光晕、呼吸动画、星空背景
- **📱 响应式设计** — 自适应各种屏幕尺寸

## 🚀 快速开始

直接在浏览器中打开 `index.html`，或访问 GitHub Pages 在线体验。

```bash
# 本地运行
npx serve .
# 或
python -m http.server 8080
```

> **注意：** 手势识别功能需要 HTTPS 或 localhost 环境，且需要摄像头权限。

## 🎮 操作指南

| 操作 | 手势/鼠标 | 效果 |
|------|----------|------|
| 聚散 | ✊ 握拳 / ✋ 张手 | 粒子聚成玫瑰 / 散开 |
| 旋转 | 👈👉 手掌左右 / 鼠标拖拽 | 旋转视角 |
| 缩放 | 🔍 手掌远近 / 鼠标滚轮 | 放大缩小 |
| 重置 | 按 `R` 键 | 恢复默认视角 |
| 全屏 | 按 `F` 键 | 切换全屏 |
| 强制玫瑰 | 按 `1` 键 | 粒子聚成玫瑰 |
| 强制散开 | 按 `2` 键 | 粒子散开 |

## 🛠️ 技术栈

- [Three.js](https://threejs.org/) — WebGL 3D渲染引擎
- [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) — 手部关键点检测
- 纯前端静态页面，无需构建工具

## 📂 项目结构

```
├── index.html          # 主页面（包含所有CSS和JS）
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions 自动部署
└── README.md
```

## 📄 License

MIT License
