import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const userInfoApi = {
  storeSetUserInfo: (userInfoType, userInfo) => {
    return ipcRenderer.invoke('window:setUserInfo', userInfoType, userInfo)
  },
  storeGetUserInfo: (userInfoType) => {
    return ipcRenderer.invoke('window:getUserInfo', userInfoType)
  }
}

const loadApi = {
  // 判断是否需要进行初始化
  isNeedInitData: () => {
    return ipcRenderer.invoke('loading-isNeedInit')
  },
  // 初始化完成，进入main界面
  loadFinish: () => {
    ipcRenderer.send('close-loading-window')
  },
  // 发送数据初始化完成
  dataInitializationComplete: (data) => {
    ipcRenderer.send('data-initialization-complete', data)
  },
  dataInitSuccessAndSkip: (callback) => {
    ipcRenderer.on('skip', callback)
  },
  // 向渲染进程发送消息，在跳转路由，防止第一次进入消息加载不出来
  onDataInitComplete: (callback) => {
    ipcRenderer.once('data-init-complete', callback)
  }
}

const dbApi = {
  // 查询会话列表
  queryConversationList: () => {
    return ipcRenderer.invoke('query:conversation')
  },
  // 查询好友列表
  queryFriendList: () => {
    return ipcRenderer.invoke('query:friend')
  },
  // 分页加载消息
  loadMessage: (conversationId, messagePageInfo) => {
    return ipcRenderer.invoke('load:message', conversationId, messagePageInfo)
  },
  // 登录时更新离线消息，会话状态，好友状态
  updateDBData: () => {
    ipcRenderer.send('update:db')
  },
  // 保存用户发送成功消息
  saveSentMessage: (message) => {
    ipcRenderer.send('save:message', message)
  },
  saveLoadMessage: (messageList) => {
    ipcRenderer.send('save:loadMessage', messageList)
  },
  updateConversation: (condition, data) => {
    ipcRenderer.send('update:conversation', condition, data)
  },
  addConversation: (conversationPack) => {
    ipcRenderer.send('add:conversation', conversationPack)
  },
}

const uploadFileApi = {
  selectFile: (file) => {
    return ipcRenderer.invoke('select-file', file)
  },
  uploadFile: (file) => {
    return ipcRenderer.invoke('upload-file', file)
  },
  updateProgress: (callback) => {
    ipcRenderer.on('upload-progress', callback)
  }
}

const windowToolApi = {
  resizeWindow: (windowType) => {
    ipcRenderer.send('window:type', windowType)
  },
  windowControls: (controlType, value) => {
    ipcRenderer.send('window:controls', controlType, value)
  },
  createNewWindow: (windowType) => {
    ipcRenderer.send('create-new-window', windowType)
  },
  destroyNewWindow: (windowType) => {
    ipcRenderer.send('destroy-new-window', windowType)
  },
}

const chatToolApi = {
  openCapture: () => {
    ipcRenderer.send('window:capture-open')
  },
  getCapturePngBuffer: (channel, func) => {
    ipcRenderer.on('window:get-capture-pngBuffer', (event, ...args) => {
      func(...args)
    })
  },
  saveCapture: (data) => {
    ipcRenderer.send('window:save-capture', data)
  },
  closeCapture: () => {
    ipcRenderer.send('window:close-capture')
  },
  sendImageToMain: (func) => {
    ipcRenderer.on('capture:image', (event, savePath) => {
      func(savePath)
    })
  },
  createFile: (arrayBuffer, fileName) => {
    return ipcRenderer.invoke('window:create-file', arrayBuffer, fileName)
  }
}

const wsApi = {
  // 发送消息
  sendMessage: (messageType, sequenceId, data) => {
    ipcRenderer.send('ws:send', {
      messageType,
      sequenceId,
      data
    })
  },
  // 接收消息
  onMessage: (callback) => {
    ipcRenderer.on('ws:receive', (event, messageType, data) => callback(messageType, data))
  }
}

const mediaHandleApi = {
  // 生成群聊头像
  generateGroupAvatar: () => {
    return ipcRenderer.invoke('generate-groupAvatar')
  },
  // 更新群聊头像
  updateGroupAvatar: (avatarUrlList) => {
    return ipcRenderer.invoke('update-groupAvatar', avatarUrlList)
  }
}

const api = {
  // 发送给主进程，主进程会把消息广播给所有窗口
  // sendToMain: (messageType, sequenceId, data) => {
  //   ipcRenderer.send('ws:send', {
  //     messageType,
  //     sequenceId,
  //     data
  //   })
  // },
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

// 只有在启用上下文隔离的情况下，才使用contextBridge API 向渲染器暴露 Electron API；否则，只需将其添加到 DOM 全局变量中。
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('userInfoApi', userInfoApi)
    contextBridge.exposeInMainWorld('loadApi', loadApi)
    contextBridge.exposeInMainWorld('dbApi', dbApi)
    contextBridge.exposeInMainWorld('uploadFileApi', uploadFileApi)
    contextBridge.exposeInMainWorld('windowToolApi', windowToolApi)
    contextBridge.exposeInMainWorld('wsApi', wsApi)
    contextBridge.exposeInMainWorld('mediaHandleApi', mediaHandleApi)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('chatToolApi', chatToolApi)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.userInfoApi = userInfoApi
  window.loadApi = loadApi
  window.dbApi = dbApi
  window.uploadFileApi = uploadFileApi
  window.windowToolApi = windowToolApi
  window.wsApi = wsApi
  window.mediaHandleApi = mediaHandleApi
  window.api = api
  window.chatToolApi = chatToolApi
}
