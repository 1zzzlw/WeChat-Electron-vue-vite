import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  resizeWindow: (windowType) => {
    ipcRenderer.send('window:type', windowType)
  },
  selectAvatar: (file) => {
    return ipcRenderer.invoke('select-avatar', file)
  },
  storeSetToken: (token) => {
    return ipcRenderer.invoke('store-set-token', token)
  },
  storeGetToken: () => {
    return ipcRenderer.invoke('store-get-token')
  },
  storeSetAvatar: (avatar) => {
    return ipcRenderer.invoke('store-set-avatar', avatar)
  },
  storeGetAvatar: () => {
    return ipcRenderer.invoke('store-get-avatar')
  },
  storeSetUserId: (userId) => {
    return ipcRenderer.invoke('store-set-userId', userId)
  },
  storeGetUserId: () => {
    return ipcRenderer.invoke('store-get-user-id')
  },
  createNewWindow: (windowType) => {
    ipcRenderer.send('create-new-window', windowType)
  },
  destroyNewWindow: (windowType) => {
    ipcRenderer.send('destroy-new-window', windowType)
  },
  // 发送给主进程，主进程会把消息广播给所有窗口
  sendToMain: (messageType, sequenceId, data) => {
    ipcRenderer.send('ws:send', {
      messageType,
      sequenceId,
      data
    })
  },
  // 主进程转发回渲染进程
  onForwardWS: (callback) => {
    ipcRenderer.on('ws:forward', (event, { messageType, sequenceId, data }) =>
      callback(messageType, sequenceId, data)
    )
  },
  // 移除监听，防止内存泄漏
  removeWsConnectListener: () => {
    ipcRenderer.removeAllListeners('ws:connect')
  }
}

const chatToolApi = {
  openCapture: () => {
    ipcRenderer.send('window:capture-open')
  },
  getCaptureBase64: (channel, func) => {
    ipcRenderer.on('window:get-capture-base64', (event, ...args) => {
      func(...args)
    })
  },
  saveCapture: (base64) => {
    ipcRenderer.send('window:save-capture', base64)
  },
  closeCapture: () => {
    ipcRenderer.send('window:close-capture')
  },
  sendImageToMain: (func) => {
    ipcRenderer.on('capture:image', (event, base64) => {
      func(base64)
    })
  }
}

// 只有在启用上下文隔离的情况下，才使用contextBridge API 向渲染器暴露 Electron API；否则，只需将其添加到 DOM 全局变量中。
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('chatToolApi', chatToolApi)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.chatToolApi = chatToolApi
}
