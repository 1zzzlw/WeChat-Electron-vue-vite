/**
 * 共享模块 — 消除 index.js 循环依赖
 *
 * 所有需要 store / mainWindow / tray 引用的模块从此处导入，
 * 不再从 index.js 导入。
 *
 * - store 立即创建，不依赖 app.whenReady
 * - mainWindow / tray 通过 refs 对象提供可变引用
 *   index.js 在 createMainWindow / createTray 后设置 refs.mainWindow / refs.tray
 */

import { app, nativeImage } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

// ─── electron-store 实例（立即创建） ──────────────────────────────────

export const store = new Store({
  name: 'user-token',
  fileExtension: 'json',
  cwd: join(app.getPath('userData'), 'store')
})

// ─── 运行时可变引用 ───────────────────────────────────────────────────

export const refs = {
  mainWindow: null,
  tray: null
}

// ─── 图标工具函数 ─────────────────────────────────────────────────────

export function getIconPath() {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../resources/icon.png')
}

export function getTrayIcon() {
  return nativeImage.createFromPath(getIconPath())
}

export function getEmptyTrayIcon() {
  return nativeImage.createEmpty()
}
