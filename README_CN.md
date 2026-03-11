# 个人作品集与 Web 项目

[ENGLISH](README.md) | 简体中文

欢迎来到我的个人作品集仓库！本项目展示了我的 Web 开发技能，包含一个现代化、设计精美的登录页，以及一系列交互式 Web 应用、游戏和 AI 集成项目。

## 特性

- **现代 UI/UX:** 响应式、仿玻璃质感的登录页 (`index.html`)，并使用 Intersection Observer 实现流畅的滚动动画。
- **原生技术栈:** 主要基于 HTML5、CSS3 自定义属性和原生 JavaScript 构建——无需沉重的前端框架。
- **集中式架构:** 共享的基础设施 (`shared.js` 和 `projects.css`) 标准化了在所有子项目中使用的 API 调用、实用函数和导航栏。
- **AI 集成:** 包含使用 Gemini LLM 和 ElevenLabs TTS（文本转语音）API 的演示项目。
- **Python 后端:** 一个轻量级的 Flask 服务器 (`app.py`) 用于处理静态文件服务和本地进度保存。

## 包含的项目

本仓库包含多个独立的 Web 应用程序，均可从主作品集页面访问：
1. **普通话词汇测验 (Mandarin Vocabulary Quiz):** 与 Google Sheets 集成的抽认卡式语言学习工具。
2. **LLM 填空测验 (LLM Fill-in-the-Blank):** 自适应的、基于 AI 生成语言内容的测验。
3. **行秋的奇妙冒险 (Xingqiu's Novel Adventure):** 交互式 2D Canvas 游戏。
4. **保卫蒙德 (Protect Mondstadt):** 伪 3D 风格的 Canvas 射击游戏。
5. **词汇野生动物园 (Word Safari):** 基于表情符号匹配的英语词汇游戏。
6. **Live2D + AI 语音演示:** 一个完全可交互的 Live2D 虚拟形象，连接到 LLM 和 ElevenLabs 语音 API (`gemini.html`)。

## 快速开始

### 前置要求
- Python 3.x
- 现代 Web 浏览器
- *(可选)* ElevenLabs API 密钥（如果您想在 `gemini.html` 中运行语音合成功能）。

### 本地运行

1. 将此仓库克隆到本地机器：
   ```bash
   git clone https://github.com/JoePlayer911/cv.git
   cd cv
   ```

2. 启动本地 Flask 服务器：
   ```bash
   python app.py
   ```

3. 打开浏览器并访问：
   ```
   http://127.0.0.1:5000/
   ```

## 许可证

本项目旨在作为个人作品集展示。部分使用的 Live2D 模型版权归其各自创作者所有，并受限于 [Live2D 免费素材许可协议 (Live2D Free Material License Agreement)](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)。
