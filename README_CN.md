# 个人作品集与 Web 项目

[ENGLISH](README.md) | 简体中文

欢迎来到我的个人作品集仓库！本项目展示了我的 Web 开发技能，包含一个现代化、设计精美的登录页，以及一系列有竞技性的互动词汇游戏和 AI 集成项目。

## 特性

- **现代 UI/UX:** 响应式、仿玻璃质感的登录页 (`index.html`)，并使用 Intersection Observer 实现流畅的滚动动画。
- **原生技术栈:** 主要基于 HTML5、CSS3 自定义属性和原生 JavaScript 构建——本仓库所有页面均无需构建步骤。
- **零密钥架构:** 词汇数据通过 Google Sheets 的公开、免密钥 CSV 导出接口获取（本代码库中不存在任何 API 密钥），AI 功能使用免费、免密钥的 LLM 代理。唯一可选的密钥（ElevenLabs 语音密钥、个人 LLM7 密钥）均为"自带密钥"模式——由访问者自行粘贴到自己的浏览器中，仅保存在其本地 `localStorage`，本网站永远不会接触到这些密钥。
- **无服务器排行榜与对战:** 可选的 Firebase（Firestore + 匿名认证）驱动跨设备每日排行榜；实时 1v1 对战无需任何配置，通过 PeerJS 免费公共中转以 WebRTC 在浏览器之间直连，并提供离线机器人对手作为后备，安全性由 `firestore.rules` 保障，而非依赖隐藏密钥——详见下方的 [Firebase 配置](#firebase-配置排行榜与对战)。
- **AI 集成:** 通过免密钥代理生成的 AI 内容（Boss 谜语），以及带可选 ElevenLabs TTS 的 Live2D 虚拟形象演示。

## 包含的项目

均可从主作品集页面 (`index.html`) 访问：

1. **字龙 (Word Dragon)** — 贪吃蛇变身为龙，按正确顺序吃掉汉字拼出词语，躲开干扰字。
2. **夜市 (Night Market)** — 经营七个夜晚的小吃摊，顾客用词义、拼音或语音点餐，每道菜都是一个词。
3. **Hanzidle** — Wordle 风格的每日词汇推理解谜游戏，附带每日共享排行榜。
4. **词汇对战竞技场 (Vocab Duel Arena)** — 通过房间码进行的实时 1v1 词汇对战。
5. **词汇大逃杀：生存竞技场 (Vocab Royale: Survival Arena)** — Canvas 打字生存游戏，波次递增，Boss 战附带 AI 生成谜题。
6. **记忆宫格竞速 (Memory Grid Speedrun)** — 限时、每日随机种子的记忆配对游戏。
7. **Live2D + AI 语音演示:** 一个完全可交互的 Live2D 虚拟形象，连接到 LLM 和（可选，需自备密钥）ElevenLabs 语音 API (`gemini.html`)。

已退役的旧游戏页面保存在 `old/`（已加入 `.gitignore`，仅本地留存作参考，不会发布）。

## 使用自己的词汇表

所有游戏都从 Google 表格读取词汇：**A 列 = 中文，B 列 = 拼音（声调符号或数字），C 列 = 释义**，表头行可有可无。

1. 将表格共享为 **任何获得链接的人 → 查看者**。
2. 在任意游戏的关卡选择框中选择 **➕ Use my own Google Sheet link…** 并粘贴表格链接。链接中的工作表（`#gid=…`）即为所用的工作表。
3. 该词表保存在浏览器中，并成为所有游戏的当前词表。在任意游戏网址后加上 `?sheet=<表格链接>&name=<名称>`，任何人打开即可加载同一词表，适合课堂使用。

学习进度（按词记录的 Leitner 盒子，存储于 `localStorage`）在所有游戏间共享，答错的词会更频繁地出现。

## 本地运行

这是一个完全静态的网站——任何静态文件服务器均可使用。在仓库根目录运行：

```bash
python -m http.server 8000
# 或者
npx serve .
```

然后打开 `http://127.0.0.1:8000/`。

## Firebase 配置（排行榜）

即使不配置 Firebase，游戏本身也能完整运行——词汇获取、AI 功能和单人计分都会优雅降级。排行榜功能在配置一个免费的 Firebase 项目之前会保持隐藏：

1. 前往 [Firebase 控制台](https://console.firebase.google.com/)，创建一个新项目（或复用现有项目）。
2. **Build → Firestore Database → Create database** → 选择生产模式启动 → 选择区域。
3. **Build → Authentication → Get started** → 启用 **匿名 (Anonymous)** 登录方式（无需邮箱密码——只是为每位访问者提供一个稳定的身份标识）。
4. **项目设置（齿轮图标）→ General → Your apps** → 点击 Web 图标 (`</>`) → 注册应用（无需 Firebase Hosting）→ 复制显示出的 `firebaseConfig` 对象。
5. 将这些值粘贴到 [`firebase-client.js`](firebase-client.js) 顶部的 `firebaseConfig` 对象中（该配置并非密钥——Firebase Web 应用的安全性由安全规则保障，而非隐藏此配置）。
6. 将 [`firestore.rules`](firestore.rules) 的内容粘贴到控制台的 **Firestore Database → Rules** 中（或使用 Firebase CLI 部署：`firebase deploy --only firestore:rules`）。

完成后，重新加载任意游戏页面，排行榜功能即会自动启用。

## 许可证

本项目旨在作为个人作品集展示。部分使用的 Live2D 模型版权归其各自创作者所有，并受限于 [Live2D 免费素材许可协议 (Live2D Free Material License Agreement)](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)。
