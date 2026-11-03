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
import { existsSync } from 'node:fs'
import Store from 'electron-store'

// 改名后继续读取既有账号与聊天记录；显式指定的自定义数据目录不覆盖。
const defaultUserData = app.getPath('userData')
const appData = app.getPath('appData')
const legacyUserData = join(appData, 'zzz-im-web')
app.setName('Lumina')
if (existsSync(legacyUserData) && [join(appData, 'Lumina'), join(appData, 'lumina-agent')].includes(defaultUserData)) {
  app.setPath('userData', legacyUserData)
}

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

export function getIconPath(format = process.platform === 'win32' ? 'ico' : 'png') {
  return app.isPackaged
    ? join(process.resourcesPath, `icon.${format}`)
    : join(__dirname, `../../resources/icon.${format}`)
}

export function getTrayIcon() {
  return nativeImage.createFromPath(getIconPath('png')).resize({ width: 20, height: 20 })
}

export function getEmptyTrayIcon() {
  return nativeImage.createEmpty()
}
