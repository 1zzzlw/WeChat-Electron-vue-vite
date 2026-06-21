# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

EasyChat (zzz-im-web) — Electron 桌面即时通讯应用。前端 Vue 3 + Vite + Element Plus + Pinia，后端通过 WebSocket 自定义二进制协议通信，本地使用 better-sqlite3 存储数据。

## 常用命令

```bash
npm run dev          # 启动开发环境（electron-vite dev，含 HMR）
npm run build        # 生产构建
npm run start        # 预览构建产物
npm run lint         # ESLint 检查（eslint --cache .）
npm run format       # Prettier 格式化
npm run build:win    # 构建 Windows 安装包
npm run build:mac    # 构建 macOS 安装包
npm run build:linux  # 构建 Linux 安装包
```

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 38 + electron-vite 4 |
| 前端 | Vue 3.5 (Composition API + `<script setup>`) + Vue Router 4 (hash 模式) + Pinia 3 |
| UI 库 | Element Plus 2.11 + 自定义 CSS |
| 构建 | Vite 7 + @vitejs/plugin-vue |
| 本地数据库 | better-sqlite3（WAL 模式，文件路径 `{userData}/local.db`） |
| 实时通信 | WebSocket 自定义二进制协议（魔数 `1,2,3,4`，大端序） |
| 子进程 | Piscina worker pool（文件分片 hash 计算） |
| 富文本 | TipTap (基于 ProseMirror) |
| 文件预览 | viewerjs / v-viewer / DPlayer |
| 瀑布流 | masonry-layout（朋友圈） |
| HTTP | axios（开发时代理到 `http://127.0.0.1:81`） |

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── index.js             # 应用入口：窗口/Tray/生命周期
│   ├── websocket.js         # WebSocket 管理器（连接/重连/心跳/二进制协议编解码）
│   ├── DB/
│   │   ├── mainDB.js        # better-sqlite3 初始化 + CRUD 封装（驼峰↔下划线映射）
│   │   ├── tableInfo.js     # DDL：message / conversation / friend_relation / favorites 表
│   │   ├── insert.js / update.js / delete.js / select.js  # 按表封装的业务 DB 操作
│   │   └── utils.js         # 驼峰/下划线转换工具
│   ├── File/
│   │   ├── fileUpload.js    # 分片上传引擎（MessageQueue 控制并发、暂停/恢复、进度）
│   │   ├── worker.js        # Piscina worker：逐片读取文件 + 计算 chunk hash
│   │   ├── createWorkerProcess.js  # 创建 worker 池，协调分片读取流程
│   │   ├── downloadFile.js  # 文件下载
│   │   ├── filterFileKind.js # 文件类型判断（图片/视频/音频/通用文件）
│   │   ├── computedChunkHash.js
│   │   └── poolConfig.js
│   ├── IPC/
│   │   ├── index.js         # IPC 注册中心：关键模块同步加载，非关键模块延迟加载
│   │   ├── userInfoStoreIPC.js / DBIPC.js / websocketIPC.js / windowToolIPC.js
│   │   ├── chatToolIPC.js / initDataIPC.js / piniaStoreIPC.js
│   │   ├── newWindowIPC.js / uploadFileIPC.js / mediaHandleIPC.js / updateNewDataIPC.js
│   ├── API/
│   │   ├── message.js       # 服务端 HTTP API（文件上传相关）
│   │   └── initData.js      # 初始化数据拉取
│   └── Util/
│       ├── createNewWindow.js  # 子窗口统一管理（窗口池、懒加载数据传递、超时保护）
│       ├── messageQueue.js     # 可暂停/恢复的并发队列（文件上传用）
│       ├── mediaHandle.js      # 图片/视频预览图生成（FFmpeg）
│       └── request.js          # HTTP 请求辅助
├── preload/
│   └── index.js             # contextBridge 暴露 10 组 API 到渲染进程
├── renderer/src/
│   ├── main.js              # Vue 应用入口
│   ├── App.vue              # 根组件：挂载 WS 消息处理器 + 壁纸 + 文件传输 handler
│   ├── router/router.js     # 路由配置（hash 模式，含 auth guard + 子窗口白名单）
│   ├── api/                 # 服务端 HTTP 接口封装（Message / User / Friend / AI / Favorites 等）
│   ├── stores/
│   │   ├── index.ts         # Pinia 实例创建 + 持久化插件 + shareStorePlugin
│   │   └── modules/         # 按领域划分的 store：Conversation / Contact / Message / Group / AI / File 等
│   ├── types/               # TypeScript 类型定义（conversation.ts / friend.ts / aiMessage.ts / moments.ts 等）
│   ├── handlers/            # WS 消息处理 / 文件传输事件处理 / 壁纸处理
│   ├── views/               # 路由页面
│   │   ├── login/           # 登录
│   │   ├── register/        # 注册（信息填写 → 头像上传）
│   │   ├── layout/Main.vue  # 主布局容器
│   │   ├── chat/            # 私聊 / 群聊 / AI 聊天 / 独立聊天窗口
│   │   ├── user/            # 好友列表 / 会话列表 / 收藏 / 创建群聊
│   │   ├── friend/          # 好友申请 / 好友详情
│   │   ├── group/           # 群信息 / 群申请
│   │   ├── moments/         # 朋友圈（瀑布流）
│   │   ├── collect/         # 收藏（笔记创建/编辑）
│   │   ├── setting/         # 账号 / 存储路径 / 快捷键 / 通知 / 关于
│   │   ├── media/           # 图片/视频预览
│   │   └── wallet/          # 钱包
│   ├── components/          # 可复用组件（ChatHeader / ContextMenu / 媒体消息组件 等）
│   ├── utils/               # 工具函数
│   └── db/                  # 渲染进程本地 DB 辅助（dualDB.js / syncDB.js）
```

## 核心架构

### IPC 通信

渲染进程通过 preload 暴露的 10 组 API 与主进程通信，全部走 `ipcRenderer.invoke`（双向）或 `ipcRenderer.send`（单向）+ `ipcRenderer.on`（推送）：

- `userInfoApi` — 读写 electron-store（token / 用户设置）
- `dbApi` — 本地 SQLite 增删改查
- `wsApi` — WebSocket 消息收发
- `uploadFileApi` — 文件上传/下载 + 进度推送
- `windowToolApi` — 窗口管理（创建子窗口 / 调整大小 / 壁纸 / 快捷键）
- `chatToolApi` — 截图 / 剪贴板
- `loadApi` — 启动初始化流程控制
- `piniaShareApi` — 多窗口间 Pinia Store 状态同步
- `mediaHandleApi` — 群头像合成
- `soundApi` — 消息提示音播放

新增 IPC 通道时，在 `src/main/IPC/` 下新建文件并在 `src/main/IPC/index.js` 中注册，同时在 `src/preload/index.js` 中添加对应的 API 对象。

### WebSocket 协议

自研二进制协议（大端序），消息结构为：
```
魔数(4B: 1,2,3,4) + 版本号(1B) + 序列化方式(1B: 0=JSON) + 消息类型(1B) + 序列号(4B) + 填充(1B: 0xFF) + 正文长度(4B) + 正文
```

WebSocketManager 在 `src/main/websocket.js`，支持自动重连（最多 3 次），心跳间隔 60s。消息类型按 `messageType` 区分业务逻辑。

### 数据库

应用启动时自动初始化 SQLite 表结构（`initTable()`），并建立驼峰字段名 ↔ 下划线字段名的双向映射表（`globalColumnsMap`），CRUD 操作自动转换。核心表：`message` / `conversation` / `friend_relation` / `favorites`。

### 文件上传

分片上传流程：主进程 `fileUpload.js` 协调 → Piscina worker 逐片读取文件 + 计算 hash → MessageQueue 控制并发（单文件 2 并发，全局积压阈值 6）→ HTTP 分片上传到 MinIO → 全部完成后 merge。支持暂停/恢复、背压控制。

### 多窗口管理

通过 `createExtraWindow()` 统一创建子窗口，维护 `windowPool` 管理生命周期。窗口间通信通过 `piniaShareApi` 同步 Store 状态。懒加载组件通过 `pendingWindowData` 缓存 + `window:getPendingData` IPC 主动拉取解决时序问题。

### 路由守卫

`/main` 下所有路由需要 token（存于 electron-store），白名单路由（登录/注册系列）和子窗口路由（通过 IPC 传参，不走 token 鉴权）直接放行。

## CSS 设计系统

项目采用**暗色玻璃拟态（Glassmorphism Dark Theme）**风格，所有面板/容器均为半透明 + 模糊背景，叠加在自定义壁纸之上，形成层次分明的视觉体验。

### 色彩体系

设计 Token 定义在 [src/renderer/src/assets/styles/variables.css](src/renderer/src/assets/styles/variables.css)。

| 角色 | 色值 | 用途 |
|---|---|---|
| **主强调色（青蓝）** | `#43f3ff` | 标题、高亮文字、活跃状态、FAB 按钮、渐变发光 |
| **次强调色（蓝）** | `rgba(66, 153, 225, 0.2~0.6)` | 边框、按钮背景、hover 态、滚动条滑块、阴影 |
| **最深背景** | `rgba(28, 38, 50, 0.95)` | 主内容区底色、对话框背景 |
| **中背景** | `rgba(35, 45, 60, 0.7)` | 侧边栏、列表项、输入框 |
| **浅背景** | `rgba(40, 50, 65, 0.75)` | 列表顶部栏、卡片 hover 渐变 |
| **主文字** | `#f0f0f0` / `#ffffff` | 正文、标题 |
| **次文字** | `rgba(255, 255, 255, 0.7)` | 辅助信息、placeholder |
| **危险色** | `#ff4757` | 点赞活跃态、删除操作 |
| **警告色** | `#ff884d` | 警告状态 |
| **成功色** | `#4cd964` | 在线状态指示 |
| **红包色** | `#ff5a5f` | 红包按钮 hover |

**实际使用中的色值模式**（非精确 token，按透明度梯度使用）：

```
rgba(66, 153, 225, 0.1)  — 最淡的蓝色背景（hover 底色、高亮底色）
rgba(66, 153, 225, 0.2)  — 边框/按钮默认背景
rgba(66, 153, 225, 0.3)  — hover 边框/hover 背景
rgba(66, 153, 225, 0.4)  — 聚焦边框/选中态
rgba(66, 153, 225, 0.6)  — 置顶高亮条/强激活态
rgba(66, 153, 225, 0.9)  — 图标 hover 文字色
```

### 玻璃拟态（Glassmorphism）

**这是项目最核心的视觉语言。** 几乎所有容器组件都遵循此模式：

```css
/* 基础玻璃面板 */
.glass-panel {
  background: rgba(28, 38, 50, 0.4);        /* 半透明深蓝灰底 */
  backdrop-filter: blur(10px);               /* 模糊背后内容（壁纸穿透） */
  -webkit-backdrop-filter: blur(10px);       /* WebKit 兼容 */
  border: 1px solid rgba(66, 153, 225, 0.2); /* 微妙的蓝色边框 */
  border-radius: 8px;                        /* 统一圆角 */
}
```

**模糊强度按层级递增**（离壁纸越远越模糊）：
- `blur(6px)` — 输入框内部、聊天气泡、引用预览
- `blur(8px)` — 侧边栏、按钮、文件预览
- `blur(10px)` — 主内容区、聊天区域、朋友圈卡片
- `blur(12px)` — 左侧主导航、popover 容器、设置面板、搜索工具栏
- `blur(15px)` — 设置左侧栏
- `blur(20px)` — 用户卡片 popover（最强模糊，突出层级）

**背景透明度按层级**（越底层越透明，让壁纸透过来）：
- `0.2` — 侧边栏（极度透明，壁纸清晰可见）
- `0.4` — 主内容区
- `0.65` — popover 弹出层
- `0.95` — 对话框（几乎不透明，与壁纸隔离）

### 侧边栏三栏布局模式

列表视图（会话列表/好友列表/收藏列表）使用统一的三栏布局，样式集中在 [src/renderer/src/css/layout.css](src/renderer/src/css/layout.css)：

```css
/* 左侧面板（200px） */
.left-panel {
  background-color: rgba(35, 45, 60, 0.2);
  backdrop-filter: blur(8px);
  border-right: 1px solid rgba(66, 153, 225, 0.4);
}
```

列表项 hover 效果 — 微 3D 浮起 + 蓝色发光：
```css
.list-item:hover {
  background-color: rgba(50, 70, 95, 0.7);
  transform: translate3d(0, -2px, 5px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
  text-shadow: 0 0 6px rgba(66, 153, 225, 0.3);
}
```

### 主导航栏（Main.vue 左侧）

固定在 80px 宽，垂直排列图标，使用 iconfont 图标字体 + Element Plus Icons：
```css
.nav-left {
  background: rgba(22, 28, 36, 0.2);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(66, 153, 225, 0.2);
}
/* 图标默认半透明白，hover 变为蓝色 + 发光 */
.nav-icon { color: rgba(240, 240, 240, 0.8); }
.nav-icon:hover {
  color: rgba(66, 153, 225, 0.9);
  transform: scale(1.08);
  text-shadow: 0 0 8px rgba(66, 153, 225, 0.4);
}
```

### 头像样式

| 场景 | 尺寸 | 圆角 | 特殊样式 |
|---|---|---|---|
| 导航栏头像 | 50×50 | `10px` | 蓝色发光阴影 + 淡蓝边框，hover 放大 1.05 + 增强发光 |
| 列表项头像 | 50×50 | `10px` | 无特殊效果，离线时 `filter: grayscale(100%)` |
| 聊天消息头像 | 50×50 | `10px` | 基础圆角 |
| 朋友圈头像 | 42×42 | `50%`（圆形） | 青蓝边框 `rgba(67, 243, 255, 0.2)`，hover 旋转 15° |
| 用户卡片头像 | 70×70 | `12px` | 白色半透明边框 + 阴影 |
| 账号设置头像 | 120×120 | `50%`（圆形） | 白色半透明粗边框 |

**头像发光阴影**（导航栏使用）：
```css
box-shadow: 0 0 8px rgba(179, 200, 255, 0.6),
            0 0 20px rgba(120, 140, 255, 0.4);
border: 1px solid rgba(179, 200, 255, 0.3);
```

### 聊天气泡

左右两侧气泡带有三角形指示器，背景为玻璃质感：

```css
/* 对方消息（左侧） */
.left-bubble {
  background: rgba(45, 55, 70, 0.85);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-bottom-left-radius: 0;
}
.left-bubble::before { /* 三角形指示器指向左边 */ }

/* 自己消息（右侧） */
.right-bubble {
  background: rgba(66, 153, 225, 0.35);
  border: 1px solid rgba(66, 153, 225, 0.2);
  border-bottom-right-radius: 0;
}
.right-bubble::after { /* 三角形指示器指向右边 */ }
```

### 登录/注册页旋转边框动画

使用 `repeating-conic-gradient` + `@property --a` + `@keyframes animate` 实现边框旋转光效：

```css
.container::before {
  background: repeating-conic-gradient(
    from var(--a),
    #43f3ff 0%, #43f3ff 10%,    /* 登录页用青蓝色 */
    transparent 10%, transparent 80%,
    #43f3ff 100%
  );
  animation: animate 2.5s linear infinite;
}
/* 注册页用粉色 #ff76e0 */
```

背景层使用模糊的壁纸图片：
```css
.container span::before {
  background: url('../assets/image/4.jpg') fixed center;
  filter: blur(10px);
}
```

### Element Plus 深度覆盖模式

所有 Element Plus 组件的暗色玻璃适配都通过 `:deep()` 穿透，**不要覆盖全局 Element Plus 样式，始终在组件 scoped style 中使用 `:deep()`**。

#### 输入框（el-input）
```css
:deep(.el-input__wrapper) {
  background: rgba(35, 45, 60, 0.7);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(66, 153, 225, 0.2);
  box-shadow: none;                          /* 移除默认阴影 */
}
:deep(.el-input__wrapper:focus-within) {
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.25);  /* 蓝色聚焦环 */
  border-color: rgba(66, 153, 225, 0.4);
}
:deep(.el-input__inner) {
  color: #f0f0f0;                            /* 白色文字 */
}
```

#### 按钮（el-button--primary）
```css
:deep(.el-button--primary) {
  background: rgba(66, 153, 225, 0.2);       /* 蓝底玻璃 */
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2),
              inset 0 1px 2px rgba(255, 255, 255, 0.08);
  color: #f0f0f0;
}
:deep(.el-button--primary:hover) {
  background: rgba(66, 153, 225, 0.3);
  transform: translateY(-1px);
}
```

#### 滚动条（el-scrollbar）
```css
:deep(.el-scrollbar__thumb) {
  background: rgba(67, 243, 255, 0.4);       /* 青蓝色滑块 */
  border-radius: 4px;
}
/* hover 时加深 */
:deep(.el-scrollbar__thumb:hover) {
  background: rgba(67, 243, 255, 0.6);
}
```

#### 折叠面板（el-collapse）
```css
:deep(.el-collapse) {
  background-color: transparent;              /* 完全透明 */
  border: none;
}
:deep(.el-collapse-item__header) {
  color: #ffffff;                             /* 白色标题 */
  background-color: transparent;
  border: none;
}
```

#### 对话框（el-dialog）
```css
:deep(.el-dialog) {
  background: rgba(28, 38, 50, 0.95);        /* 几乎不透 */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

#### Popover / Popper 下拉
```css
:global(.xxx-popper) {
  background: rgba(28, 38, 50, 0.8) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(67, 243, 255, 0.3) !important;
  border-radius: 8px !important;
}
/* 注意：popper 挂载在 body 上，需使用 :global() 或非 scoped <style> 块 */
```

### 交互效果模式

**hover 浮起**（卡片、按钮、列表项通用）：
```css
.element:hover {
  transform: translateY(-1px) / translateY(-2px);
  box-shadow: /* 增强阴影 + 蓝色发光 */;
  transition: all 0.3s ease;
}
```

**缩放反馈**（图标、按钮、FAB）：

```css
.icon:hover {
  transform: scale(1.08) / scale(1.1);
  transition: all 0.2s ease;
}
```

**活跃按下**：
```css
.btn:active {
  transform: scale(0.95) / translateY(0);
  box-shadow: /* 减弱阴影 */;
}
```

### 自定义滚动条（Chat 输入框等）

```css
.textarea::-webkit-scrollbar { width: 6px; }
.textarea::-webkit-scrollbar-thumb {
  background: rgba(66, 153, 225, 0.3);
  border-radius: 3px;
}
.textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(66, 153, 225, 0.5);
}
.textarea::-webkit-scrollbar-track {
  background: transparent;
}
```

### 全局 reset

集中在 [src/renderer/src/assets/main.css](src/renderer/src/assets/main.css)：
- `* { margin:0; padding:0; box-sizing:border-box; border:none; outline:none; background:none }`
- `html, body { user-select:none; background-size:cover; scrollbar-width:none }` — 禁止文本选中，隐藏原生滚动条
- `img { -webkit-user-drag:none }` — 禁止拖拽图片
- `a { color:inherit; text-decoration:none; -webkit-user-drag:none }` — 统一链接样式

### 壁纸系统

壁纸存在 `public/wallpaper/` 下（1.jpg ~ 6.jpg），运行时通过以下方式动态设置：
- `document.body.style.backgroundImage = url(...)` — 主窗口 body 背景
- `window.windowToolApi.sendWindowWallpaper(imagePath)` — 通过 IPC 同步到其他窗口
- 所有面板使用半透明背景 + backdrop-filter，自然透出壁纸
- 登录/注册页使用 `background: url(...) fixed center; filter: blur(10px)` 作为容器内模糊背景层

### 编写新 UI 组件的规则

1. **永远使用半透明背景**，不要用纯色。即使是深色背景也要带透明度让壁纸穿透。
2. **加上 `backdrop-filter: blur()` 和 `-webkit-backdrop-filter`**（WebKit 兼容必须）。
3. **边框用蓝色系半透明** `rgba(66, 153, 225, 0.X)` 或 `rgba(67, 243, 255, 0.X)`，不要用纯白边框。
4. **文字颜色用 `#f0f0f0` / `#ffffff`** 系列，不要用纯黑。
5. **hover 状态加蓝色发光**（text-shadow / box-shadow 带蓝色调）+ 微位移。
6. **圆角统一用 `8px` / `10px` / `12px`**，有 token 定义的优先用 `var(--radius-*)`。
7. **动画过渡统一 `0.2s ~ 0.3s ease`**，卡片入场可用 `cubic-bezier(0.175, 0.885, 0.32, 1.275)`。
8. **Element Plus 组件覆盖用 `:deep()` 在 scoped style 中**，popper/dropdown 挂载 body 的用非 scoped `<style>` 块或 `:global()`。
9. **不要引入额外的颜色**，优先使用已有的 `#43f3ff` / `rgba(66, 153, 225, ...)` / `rgba(67, 243, 255, ...)` 色系。
10. **新组件风格参照同目录已有组件**，保持视觉一致性。

## 开发注意

- 开发环境渲染层服务代理到 `http://127.0.0.1:81`，WebSocket 连接 `ws://127.0.0.1:80`，注意 CSP 配置中的 connect-src 白名单。
- `electron-store` 被排除在 `externalizeDepsPlugin` 之外，需要打包进主进程。
- 生产环境 `extraResources` 将 File worker、icon、提示音复制到 resources 目录，`asarUnpack` 包含 FFmpeg/FFprobe 原生模块。
- F12 / Ctrl+Shift+I 仅在开发模式下注册为 DevTools 快捷键。
- 主进程入口 `src/main/index.js`，preload 入口 `src/preload/index.js`，渲染进程入口 `src/renderer/src/main.js`。
- Worker 单独构建入口（`electron.vite.config.mjs` → `rollupOptions.input.worker`），输出到 `out/main/File/worker.js`。

## 性能优化规范

每条规则标注强制级别：

| 标签 | 含义 |
|---|---|
| **🔴 强制** | 必须遵守，违反会导致内存泄漏/安全漏洞/应用崩溃 |
| **🟡 强烈建议** | 应该遵守，违反会导致可感知的性能下降 |
| **🟢 建议** | 推荐遵守，提升代码健壮性和长期可维护性 |

---

### 一、内存泄漏防范

#### 1.1 IPC 监听器生命周期管理 🔴 强制

**背景**：项目通过 preload 暴露的 `ipcRenderer.on` 向渲染进程推送事件（`upload-progress`、`download-progress`、`ws:receive`、`play:messageSound` 等）。这些监听器如果不在组件/窗口销毁时移除，会导致：
- 已销毁窗口的 webContents 仍在接收消息，主进程 `BrowserWindow.getAllWindows().forEach()` 遍历到野指针
- 回调闭包持有已卸载组件的引用，Vue 组件无法被 GC

**规则**：所有 `ipcRenderer.on` 必须在 `onUnmounted` / `onBeforeUnmount` 中调用 `ipcRenderer.removeListener` 移除。

```ts
// ✅ 正确：注册时保存引用，卸载时移除
// src/preload/index.js — 修改 soundApi 模式为通用模式
const createListener = (channel, callback) => {
  ipcRenderer.on(channel, callback)
  return () => ipcRenderer.removeListener(channel, callback)
}
contextBridge.exposeInMainWorld('listenerApi', { createListener })

// Vue 组件使用
import { onUnmounted } from 'vue'
let removeUploadProgress = null

onMounted(() => {
  removeUploadProgress = window.listenerApi.createListener('upload-progress', (e, data) => {
    fileStatusListInfo().updateFileUploadProgressStatus(data.fileId, data.uploadProgress, data.uploadSpeed)
  })
})

onUnmounted(() => {
  removeUploadProgress?.()
})
```

```js
// ❌ 当前做法：preload 中 ipcRenderer.on 注册后永不移除
// src/preload/index.js — uploadFileApi.updateUploadProgress
// 每次 App.vue 重新挂载都会累加监听器
// 应该迁移到渲染进程侧管理生命周期
```

**当前架构适配**：文件传输 handler 在 `App.vue onMounted` 中通过 `_fileTransferHandlersRegistered` 防重入只注册一次，这避免了重复但缺少卸载。改为在 `App.vue onUnmounted` 中移除，或者将 handler 注册下沉到具体使用组件（`ChatBase.vue`）中。

#### 1.2 Pinia Store 数据上限 🔴 强制

**背景**：项目有 3 个持续增长的 Store：
- `messageInfo.messageMap` — 每个会话的消息数组
- `conversationInfo.conversationMap` — 所有会话
- `friendInfo.friendInfoMap` — 所有好友

`messageMap` 已有 `MAX_MESSAGES_PER_CONVERSATION = 500` + `_trimMessages()` 限制（✅ 已做）。但 `fileMessgaeMap` 无上限。

```ts
// ✅ 已有（MessageStore.ts — 保持）
const MAX_MESSAGES_PER_CONVERSATION = 500
_trimMessages(conversationId: string) {
  const messages = this.messageMap[conversationId]
  if (messages && messages.length > MAX_MESSAGES_PER_CONVERSATION) {
    this.messageMap[conversationId] = messages.slice(-MAX_MESSAGES_PER_CONVERSATION)
  }
}

// ❌ 需要修复：fileMessgaeMap 无上限
// 发送完成后应主动清理
removeFileMessage(fileId: string) {
  delete this.fileMessgaeMap[fileId]
}
// 在 uploadFileApi.updateUploadStatus success/fail 回调中，调用 removeFileMessage
```

**规则**：任何持久化或半持久化的 Map/Object/Array Store 必须有上限 + 淘汰策略。建议：
- `conversationMap` — 无上限但用户会话数天然有限，可接受
- `messageMap` — 已有 500 条限制 ✅
- `fileMessgaeMap` — 上传成功/失败后立即清理 🟡
- `pendingMessages` — 超时机制已有（5s），但需确保 `stopTimeoutChecker` 在 store reset 时被调用

#### 1.3 observer / timer / emitter 清理 🔴 强制

**背景**：项目中使用了多种需要手动释放的资源：

```ts
// ✅ Moments.vue onUnmounted — 已有完整清理
onUnmounted(() => {
  if (observer) observer.disconnect()           // IntersectionObserver
  if (resizeObserver) resizeObserver.disconnect() // ResizeObserver
  imageLazy.destroy()                            // 自定义懒加载 observer
  if (masonry) masonry.destroy?.()               // Masonry 实例
  if (layoutTimer) clearTimeout(layoutTimer)      // debounce timer
  emitter.off('moments:updated', handleNewPostPublished) // mitt 事件
  observedImages.forEach(img => {                 // 图片事件监听器
    img.removeEventListener('load', debouncedLayout)
    img.removeEventListener('error', debouncedLayout)
  })
  observedImages.clear()
})
```

**规则**：`onUnmounted` 中必须清理的清单：
| 资源类型 | 清理方法 |
|---|---|
| `IntersectionObserver` / `ResizeObserver` / `MutationObserver` | `.disconnect()` |
| `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` |
| `emitter.on` (mitt) | `emitter.off` |
| `addEventListener` (img load/error) | `removeEventListener` |
| Pinia `$subscribe` | 调用返回的 unsubscribe 函数 |
| `ipcRenderer.on` | `ipcRenderer.removeListener` |
| Masonry / 第三方库实例 | 调用库提供的 destroy 方法 |

#### 1.4 主进程 Map/Set 清理 🔴 强制

**背景**：主进程中有多处全局 Map，用于管理上传/下载/窗口状态。如果文件操作异常终止（网络断开、应用崩溃），这些 Map 中的条目可能永久残留。

```js
// src/main/File/fileUpload.js — 当前已有的 Map
const fileUploadQueueMap = new Map()        // MessageQueue 实例
const uploadControllers = new Map()         // AbortController
const fileVerifyMap = new Map()             // 上传凭证
const fileStreamControllerMap = new Map()   // 读流控制器
const fileUploadMetaMap = new Map()         // 上传元信息

// src/main/File/downloadFile.js
const activeDownloads = new Map()           // 活跃下载任务

// src/main/Util/createNewWindow.js
const windowPool = new Map()                // 子窗口实例
```

**规则**：

```js
// ✅ cleanupFileUploadState(fileId) — 已有完整清理
// 确保在所有退出路径调用：
// 1. 上传成功 → mergeFile 回调
// 2. 上传失败 → mergeFile 失败回调  
// 3. 用户取消 → stopUpload（只暂停，不清理）
// 4. 应用退出 → app.on('will-quit')

// 🟡 需要添加：应用退出时清理所有活跃任务
// src/main/index.js — will-quit 事件中
app.on('will-quit', () => {
  // ... 现有清理代码 ...
  
  // 清理所有活跃的文件上传状态
  for (const [fileId] of fileUploadQueueMap) {
    cleanupFileUploadState(fileId)
  }
  // 清理所有活跃的下载连接
  for (const [fileId, state] of activeDownloads) {
    if (state.stream && !state.stream.destroyed) state.stream.destroy()
    if (state.req) state.req.destroy()
    if (state.redirectReq) state.redirectReq.destroy()
    activeDownloads.delete(fileId)
  }
})
```

#### 1.5 WebSocket 广播优化 🟡 强烈建议

**当前问题**：`src/main/websocket.js` 中每条 WS 消息都遍历所有窗口：

```js
// ❌ 当前：每条消息都 O(n) 遍历所有窗口
BrowserWindow.getAllWindows().forEach(win => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('ws:receive', messageType, data)
  }
})
```

**优化**：对于高频消息（消息类型 2/4），当只有一个窗口时跳过遍历：

```js
// ✅ 优化后
const windows = BrowserWindow.getAllWindows()
if (windows.length === 1) {
  windows[0].webContents.send('ws:receive', messageType, data)
} else {
  windows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('ws:receive', messageType, data)
    }
  })
}
```

---

### 二、Vue 渲染效率

#### 2.1 大列表排序避免重复计算 🟡 强烈建议

**当前问题**：`UserConversationList.vue` 中 `conversationListArr` 是 computed，每次依赖变化都会重新 `.sort()`，即使实际顺序没变。

```ts
// ❌ 当前：每次任何会话更新都全量排序
const conversationListArr = computed(() => {
  const list = Object.values(conversationStore.conversationMap)
  return list.sort((a, b) => { /* 置顶优先 + 时间排序 */ })
})
```

```ts
// ✅ 优化：缓存排序结果，仅在新增/更新会话时重排
// 利用 Pinia store 的 $subscribe 做精准失效
const sortedList = ref<Conversation[]>([])
let sortDirty = true

conversationStore.$subscribe(() => { sortDirty = true })

const conversationListArr = computed(() => {
  if (sortDirty) {
    const list = Object.values(conversationStore.conversationMap)
    sortedList.value = list.sort((a, b) => { /* ... */ })
    sortDirty = false
  }
  return sortedList.value
})
```

#### 2.2 消息列表避免 deep watch 🔴 强制

**当前问题**：`Moments.vue` 中：

```js
// ❌ 当前：deep watch 遍历整个帖子数组，每个属性变化都触发
watch(postList, async () => {
  await nextTick()
  if (masonry) {
    masonry.reloadItems?.()
    observeImages()
    masonry.layout?.()
  }
  imageLazy.observeAll()
}, { deep: true })
```

当 `postList` 有 80+ 条帖子时，每条帖子的点赞数变化都会触发深度遍历 + masonry 重新布局。

```ts
// ✅ 修复：用 shallow watch + 手动触发
// 只在数组长度变化时重新布局（新增/删除帖子）
watch(() => postList.value.length, async () => {
  await nextTick()
  if (masonry) {
    masonry.reloadItems?.()
    observeImages()
    masonry.layout?.()
  }
  imageLazy.observeAll()
})

// 点赞/互动等内部属性变化：直接修改 DOM，不触发 masonry 重排
function handleLike(postId: number) {
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.liked = !post.liked
    post.likeCount += post.liked ? 1 : -1
    // 不需要触发 masonry.layout()，卡片尺寸未变
  }
}
```

#### 2.3 虚拟/懒渲染长列表 🟡 强烈建议

**当前状态**：
- 消息列表 (`ChatBase.vue`)：无虚拟滚动，依赖 `el-scrollbar` + `MAX_MESSAGES_PER_CONVERSATION = 500` 兜底 ✅（500 条 DOM 可接受）
- 朋友圈 (`Moments.vue`)：Masonry 布局 + `content-visibility: auto` + `useMomentsImageLazy` 进行 DOM 裁剪 ✅（已做得很好）
- 会话列表 (`UserConversationList.vue`)：无上限但用户会话数天然有限 ✅

**规则**：当列表项可能超过 200 条时，必须有上限或虚拟化方案。当前项目的 `MAX_MESSAGES_PER_CONVERSATION = 500` + 朋友圈 `maxRenderedPosts = 80` 策略是合理的，保持即可。

#### 2.4 高频 IPC 事件节流 🟡 强烈建议

**当前问题**：上传/下载进度事件每个分片都触发一次 IPC，大文件可能每秒触发数十次：

```js
// src/main/File/fileUpload.js — 每个 chunk 上传成功都 send
mainWindow.webContents.send('upload-progress', {
  fileId, uploadProgress: progress, uploadSpeed: speedMB
})
```

```js
// ✅ 优化：渲染进程侧用 requestAnimationFrame 合并更新
// src/renderer/src/handlers/fileTransferHandlers.js
const progressCache = new Map()

function scheduleProgressUpdate(fileId: string) {
  if (progressCache.has(fileId)) return  // 已有待处理的帧
  progressCache.set(fileId, true)
  requestAnimationFrame(() => {
    progressCache.delete(fileId)
    // 从 store 读取最新进度渲染
  })
}

window.uploadFileApi.updateUploadProgress((e, uploadStatus) => {
  const { fileId, uploadProgress, uploadSpeed } = uploadStatus
  fileStatusListInfo().updateFileUploadProgressStatus(fileId, uploadProgress, uploadSpeed)
  scheduleProgressUpdate(fileId)
})
```

---

### 三、进程隔离

#### 3.1 子窗口 nodeIntegration 必须关闭 🔴 强制

**当前问题**：[src/main/Util/createNewWindow.js:80](src/main/Util/createNewWindow.js#L80)：

```js
// ❌ 当前：子窗口 nodeIntegration: true
// 这意味着子窗口中的任何代码都可以直接访问 Node.js API
// 如果子窗口加载了第三方内容（如朋友圈富文本中的外链），存在严重安全风险
webPreferences: {
  webSecurity: false,
  nodeIntegration: true,     // 🔴 高危
  contextIsolation: true,    // 和 nodeIntegration 矛盾，实际上被削弱
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false
}
```

```js
// ✅ 修复：与主窗口保持一致
webPreferences: {
  nodeIntegration: false,    // 关闭 Node 注入
  contextIsolation: true,    // 保持上下文隔离
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,
  webSecurity: false         // 开发阶段可保留（加载本地资源需要）
}
```

> **说明**：`webSecurity: false` 目前在生产环境也开启，因为加载本地文件（`file://` + hash 路由）需要。可以评估改为自定义 protocol（`app://`）来启用 webSecurity。

#### 3.2 所有 Node.js 能力必须通过 preload 暴露 🔴 强制

**规则**：渲染进程中禁止直接使用 Node.js API。当前项目已通过 preload 的 10 组 contextBridge API 实现了这一点（✅）。新增功能时严格遵循此模式：

```ts
// ✅ 正确：通过 preload API 间接调用
const token = await window.userInfoApi.storeGetUserInfo('token')

// ❌ 禁止：渲染进程中直接引用 Node 模块
import fs from 'fs'          // 不应该出现在 renderer/src/ 下
const { ipcRenderer } = require('electron')  // 不应该出现
```

#### 3.3 主进程重型任务必须使用 Worker 线程 🔴 强制

**当前架构**：文件分片 hash 计算已使用 Piscina worker pool（✅ `src/main/File/worker.js`）：

```js
// ✅ 已有 — 保持模式
// src/main/File/createWorkerProcess.js
// Piscina worker pool 处理：
// - 分片读取大型文件
// - MD5 hash 计算
// - 避免阻塞主进程事件循环

// 🟡 未来扩展：以下场景也应使用 worker
// - 图片压缩/格式转换
// - 视频缩略图生成（当前已在主进程用 FFmpeg）
// - 大量数据导入导出
```

---

### 四、资源加载

#### 4.1 图片懒加载统一使用 composable 🟡 强烈建议

**当前状态**：朋友圈已使用 `useMomentsImageLazy`（✅），聊天图片使用 `ChatImageView` 组件直接加载。

**规则**：所有列表中的图片都应该走懒加载模式：

```vue
<!-- ✅ 通用懒加载图片组件 -->
<template>
  <img 
    :data-src="src" 
    :alt="alt"
    ref="imgRef"
    class="lazy-image"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ src: string; alt?: string }>()
const imgRef = ref<HTMLImageElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!imgRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && imgRef.value) {
          const dataSrc = imgRef.value.getAttribute('data-src')
          if (dataSrc) {
            imgRef.value.src = dataSrc
            imgRef.value.removeAttribute('data-src')
          }
          observer?.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '200px' }
  )
  observer.observe(imgRef.value)
})

onUnmounted(() => observer?.disconnect())
</script>
```

#### 4.2 离线资源优先使用本地缓存 🟢 建议

```ts
// ✅ 头像/图片优先从本地 SQLite 或 electron-store 获取
// 当前已通过 userInfoApi.storeGetUserInfo 缓存用户头像
// 消息图片 localPath 优先于 remoteUrl 展示

// 🟢 建议：本地缓存策略标准化
// 1. 先检查 localPath/downloadStatus
// 2. 已下载 → 使用本地路径
// 3. 未下载 → 使用 remoteUrl + 后台下载
```

#### 4.3 壁纸加载优化 🟢 建议

**当前**：壁纸在 `body.style.backgroundImage` 每次切换时同步加载大图。

```ts
// 🟢 建议：预加载 + 过渡
// 1. 先设置低质量缩略图（或纯色背景）
// 2. 用 new Image() 预加载高清壁纸
// 3. 加载完成后平滑过渡
function changeWallpaper(url: string) {
  const img = new Image()
  img.onload = () => {
    document.body.style.backgroundImage = `url(${url})`
    document.body.style.transition = 'background-image 0.5s ease'
  }
  img.src = url
}
```

#### 4.4 文件上传并发控制 🟡 强烈建议

**当前已做得很好**（✅）：
- `MAX_UPLOAD_BACKLOG = 6` — 全局积压阈值
- 单文件并发 2 个分片
- `MessageQueue` 控制并发
- 暂停/恢复机制
- 背压自动暂停读流

**规则**：保持现有并发参数，如果在弱网环境测试中发现内存占用过高，将 `concurrency` 从 2 降到 1，`MAX_UPLOAD_BACKLOG` 从 6 降到 3。

#### 4.5 数据库查询缓存 🟢 建议

```ts
// 🟢 建议：对高频查询做内存缓存
// 当前模式：Pinia store 做一级缓存 → SQLite 做持久化
// conversationInfo.initCache(userId) 已有缓存有效性检查 ✅

// 新增查询时遵循此模式：
// 1. 检查 Pinia store 是否有数据且未过期
// 2. 有缓存 → 直接返回
// 3. 无缓存 → 查询 SQLite → 写入 Pinia
```

---

### 五、已有优化亮点（保持）

以下模式是项目中已实现且值得继续遵循的：

| 模块 | 优化措施 | 文件 |
|---|---|---|
| 消息存储 | `MAX_MESSAGES_PER_CONVERSATION = 500` + `_trimMessages()` | [MessageStore.ts](src/renderer/src/stores/modules/MessageStore.ts) |
| 消息去重 | `addMessageMap` / `loadMessageMap` / `batchLoadMessages` 均做 ID 去重 | [MessageStore.ts](src/renderer/src/stores/modules/MessageStore.ts) |
| 朋友圈懒加载 | `useMomentsImageLazy` — data-src 延迟 + IntersectionObserver + DOM 裁剪 + 内容恢复 | [useMomentsImageLazy.ts](src/renderer/src/composables/useMomentsImageLazy.ts) |
| 朋友圈渲染 | `content-visibility: auto` + `contain-intrinsic-size` + `MAX_POSTS = 150` | [Moments.vue](src/renderer/src/views/moments/Moments.vue) |
| 聊天滚动 | `useChatScroll` — 滚动锚定 + 分页加载 + 底部检测 | [useChatScroll.ts](src/renderer/src/composables/useChatScroll.ts) |
| 文件上传背压 | `MAX_UPLOAD_BACKLOG = 6` + `backpressurePausedFileSet` 自动暂停读流 | [fileUpload.js](src/main/File/fileUpload.js) |
| 消息超时 | `pendingMessages` Map + 1s 轮询 + 5s 超时 + 自动停止计时器 | [MessageStore.ts](src/renderer/src/stores/modules/MessageStore.ts) |
| 子窗口超时 | 15s 加载超时保护 + 自动关闭 | [createNewWindow.js](src/main/Util/createNewWindow.js) |
| IPC 懒加载 | 非关键 IPC 模块延迟加载（`loadDeferredIPC`） | [IPC/index.js](src/main/IPC/index.js) |
| Pinia 选择性持久化 | `pick: ['conversationMap', '_cacheVersion', '_cacheTimestamp']` | [ConversationStore.ts](src/renderer/src/stores/modules/ConversationStore.ts) |
| 防重入保护 | `_wsHandlersRegistered` / `_fileTransferHandlersRegistered` | wsHandlers.js / fileTransferHandlers.js |

## 剩余任务路线图

基于后端数据库表结构（`wallet` / `wallet_record` / `red_packet` / `red_packet_record` / `moments` / `moment_comments`）。

**实施顺序**：朋友圈搜索 → 钱包 → 朋友圈打赏 → 红包收尾 →（远期）AI 对话

### 朋友圈搜索 🔲 零依赖

- 已有搜索框 UI，实现本地过滤 `postList`（按 `username`、`content`）
- 匹配文字高亮；搜索结果暂用列表平铺替代 Masonry
- 涉及：[Moments.vue](src/renderer/src/views/moments/Moments.vue)

### 钱包完善 🔲 前端先行可 mock

**涉及表**：`wallet`（`balance` / `freeze_balance`）、`wallet_record`（8 种 type）。

| 功能 | 说明 |
|---|---|
| 余额展示 | 可用余额 + 冻结金额（`freeze_balance`，提现中/红包未领取） |
| 充值 | 金额输入 + 快捷金额（50/100/200/500） |
| 账单流水 | 按时间倒序，每条显示 type icon + amount（收入绿/支出红）+ remark |
| 分类筛选 | tab：全部 / 充值 / 提现 / 打赏 / 红包 / 转账 |
| 月度统计 | 本月收入/支出汇总，可折叠 |

mock 策略：Pinia store + 本地随机数据，后端接口就绪后切换。涉及：[wallet.vue](src/renderer/src/views/wallet/wallet.vue)

### 朋友圈打赏 🔲 依赖钱包接口

打赏弹窗（金额输入）→ 调用打赏 API → `wallet_record` 写入 type=3（支出）/ type=4（收入）→ 更新帖子 UI

涉及：[Moments.vue](src/renderer/src/views/moments/Moments.vue)，新增打赏弹窗组件

### 红包收尾 🔲 依赖后端红包接口

**涉及表**：`red_packet`（`remain_amount` / `remain_count` / `status` 0=进行中 1=已领完 2=已过期 3=已撤回 / `expire_time`）、`red_packet_record`（`uk_packet_user` 唯一索引保证一人一次）。

**已有组件**：[SendRedPacket.vue](src/renderer/src/components/SendRedPacket.vue)、[OpenRedPacket.vue](src/renderer/src/components/OpenRedPacket.vue)、[ChatRedPacketView.vue](src/renderer/src/components/ChatRedPacketView.vue)

**待完成**：

| 功能 | 关键逻辑 |
|---|---|
| 发送红包 | `ChatBase.vue` 中 `handleSendRedPacket` 的 `TODO` → 调用发红包 API → 获得 `redPacketId` → 更新消息 `content` JSON → WS 通知 |
| 红包卡片状态 | 根据 `status` + `expire_time` 展示：可领取 / 已领取 / 已抢完 / 已过期 |
| 领取详情 | 点击已领取红包 → `red_packet_record` 查询领取人列表 + 金额 |
| 实时更新 | WS 推送领取事件 → 更新 `remain_amount` / `remain_count`，抢完时 `status` 变为 1 |

**红包消息 `content` JSON 结构**（前端约定的字段）：
```json
{
  "redPacketId": "",
  "amount": 10.00,
  "count": 5,
  "status": 0,
  "senderName": "张三",
  "blessing": "恭喜发财"
}
```

涉及：[ChatBase.vue](src/renderer/src/views/chat/ChatBase.vue)、`SendRedPacket.vue`、`OpenRedPacket.vue`、`ChatRedPacketView.vue`

### AI 对话重设计（远期）

方向为 Agent 式对话（流式 SSE、工具调用展示、上下文管理），涉及 `Ai-chat.vue`、`AIMessageStore.ts`、`PersonalityStore.ts`。**当前暂不展开，仅占位。**

### 关键约束

- **钱包余额联动**：打赏/红包支出后，前端乐观更新余额（失败回滚），`freeze_balance` 应独立展示
- **红包实时性**：领取事件通过现有 WS 推送，前端更新卡片 `status` + `remain_count`
- **多窗口一致性**：钱包余额变更通过 `piniaShareApi` 跨窗口同步
