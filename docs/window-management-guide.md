# Electron 窗口管理优化指南

## 概述

这个优化方案解决了原有窗口加载逻辑复杂、难以维护的问题，提供了统一的窗口管理方式。

## 核心改进

### 1. 统一的窗口加载器 (`window-loader.js`)

- **环境自适应**：自动处理开发环境和生产环境的差异
- **类型区分**：支持独立 HTML 文件和 SPA 路由两种加载方式
- **配置化管理**：通过配置对象管理所有窗口类型
- **易于扩展**：可以动态添加新的窗口类型

### 2. 窗口管理器 (`window-manager.js`)

- **统一创建接口**：所有窗口通过统一方法创建
- **专用创建方法**：为特殊窗口（截屏、加载）提供专用方法
- **选项合并**：智能合并默认选项和自定义选项

## 使用方法

### 创建独立 HTML 窗口

```javascript
import { createCaptureWindow, createLoadingWindow } from './window-manager.js'

// 创建截屏窗口
const captureWindow = createCaptureWindow()

// 创建加载窗口
const loadingWindow = createLoadingWindow({
  width: 400,
  height: 300
})
```

### 创建 SPA 路由窗口

```javascript
import { createSpaWindow } from './window-manager.js'

// 创建好友添加窗口
const addFriendWindow = createSpaWindow('friendAdd', {
  width: 350,
  height: 520
})

// 创建设置窗口
const settingWindow = createSpaWindow('setting', {
  width: 800,
  height: 650
})
```

### 添加新的窗口类型

```javascript
import { addWindowConfig } from './window-loader.js'

// 添加独立 HTML 页面
addWindowConfig('splash', 'splash.html', 'standalone')

// 添加 SPA 路由页面
addWindowConfig('about', '/about', 'spa')
```

## 文件结构

```
src/
├── main/
│   ├── window-loader.js      # 窗口加载逻辑
│   ├── window-manager.js     # 窗口管理器
│   └── index.js             # 主进程入口
├── renderer/
│   ├── index.html           # 主 SPA 页面
│   ├── capture.html         # 截屏页面
│   ├── loading.html         # 加载页面
│   └── src/                 # Vue 应用源码
└── preload/
    └── index.js             # 预加载脚本
```

## 配置说明

### 窗口类型配置

```javascript
const WINDOW_CONFIGS = {
  // 独立 HTML 文件
  standalone: {
    capture: 'capture.html',
    loading: 'loading.html'
  },
  // SPA 路由页面
  spa: {
    friendAdd: '/friendAdd',
    createGroup: '/createGroup',
    setting: '/setting'
  }
}
```

### 构建配置

在 `electron.vite.config.mjs` 中配置多入口：

```javascript
build: {
  rollupOptions: {
    input: {
      index: join(__dirname, 'src/renderer/index.html'),
      capture: join(__dirname, 'src/renderer/capture.html'),
      loading: join(__dirname, 'src/renderer/loading.html')
    }
  }
}
```

## 优势

1. **代码简洁**：消除了复杂的条件判断逻辑
2. **易于维护**：统一的接口和配置管理
3. **类型安全**：明确的窗口类型定义
4. **易于扩展**：新增窗口类型只需添加配置
5. **环境适配**：自动处理开发和生产环境差异

## 迁移指南

### 原有代码

```javascript
if (isCapture) {
  let capturePath = 'out/renderer/capture.html'
  win.loadFile(capturePath)
} else {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    loadUrl = `${process.env['ELECTRON_RENDERER_URL']}#${pagePath}`
    win.loadURL(loadUrl)
  } else {
    loadUrl = join(__dirname, '../renderer/index.html')
    loadUrl = `file://${loadUrl}#${pagePath}`
    win.loadURL(loadUrl)
  }
}
```

### 优化后代码

```javascript
import { loadWindowContent } from './window-loader.js'

// 加载截屏窗口
loadWindowContent(window, 'capture', 'standalone')

// 加载 SPA 路由窗口
loadWindowContent(window, 'friendAdd', 'spa')
```

## 注意事项

1. **HTML 文件位置**：独立 HTML 文件需要放在 `src/renderer/` 目录下
2. **构建配置**：需要在 Vite 配置中添加多入口配置
3. **路由配置**：SPA 路由需要在 Vue Router 中正确配置
4. **环境变量**：确保 `ELECTRON_RENDERER_URL` 在开发环境中正确设置

这个优化方案让窗口管理变得更加清晰和易于维护，同时保持了原有功能的完整性。