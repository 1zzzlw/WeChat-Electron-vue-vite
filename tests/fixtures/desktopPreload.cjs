const { contextBridge, ipcRenderer } = require('electron')

let fixtureTheme = ipcRenderer.sendSync('fixture:theme:initial')
window.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = fixtureTheme }, { once: true })
ipcRenderer.on('fixture:theme:changed', (_event, value) => {
    fixtureTheme = value
    document.documentElement.dataset.theme = value
})
contextBridge.exposeInMainWorld('themeApi', {
    getTheme: () => ipcRenderer.invoke('fixture:theme:get'),
    setTheme: value => ipcRenderer.invoke('fixture:theme:set', value),
    onThemeChanged: callback => {
        const handler = (_event, value) => callback(value)
        ipcRenderer.on('fixture:theme:changed', handler)
        return () => ipcRenderer.removeListener('fixture:theme:changed', handler)
    }
})

contextBridge.exposeInMainWorld('chatToolApi', {
    getCapturePngBuffer: (_channel, callback) => ipcRenderer.on('fixture:capture', (_event, data) => callback(data)),
    captureReady: () => ipcRenderer.send('fixture:ready'),
    captureError: () => ipcRenderer.send('fixture:error'),
    saveCapture: rect => ipcRenderer.invoke('fixture:save', rect),
    closeCapture: () => ipcRenderer.send('fixture:cancel'),
    onCaptureResult: () => () => {}
})

// Vue 页面预览使用隔离的假数据和会话，不接入用户数据库或账号。
const avatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="20" fill="#8bc4e9"/><text x="40" y="52" text-anchor="middle" font-size="38" fill="white">晴</text></svg>')
const wallpaper = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="s" x2="1" y2="1"><stop stop-color="#a4cdeb"/><stop offset=".5" stop-color="#d5eafb"/><stop offset="1" stop-color="#95bfe4"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="35"/></filter></defs><rect width="1200" height="800" fill="url(#s)"/><g filter="url(#b)" fill="white" opacity=".6"><ellipse cx="850" cy="180" rx="320" ry="80"/><ellipse cx="350" cy="580" rx="350" ry="120"/></g></svg>')
const conversation = { id: 'fixture-chat', userId: 'fixture-user', targetId: 'fixture-friend', type: 0,
    name: '晴空', avatar, remark: '', isTop: 0, isMute: 0, unreadCount: 0, status: 1,
    latestMsg: '今天的天空很好看', latestMsgTime: '2026-10-26T11:00:00' }
contextBridge.exposeInMainWorld('userInfoApi', {
    storeGetUserInfo: async key => ({ token: 'fixture-only', userId: 'fixture-user', username: '天空', avatar, wallpaperPath: wallpaper })[key],
    storeSetUserInfo: async () => {}
})
contextBridge.exposeInMainWorld('windowToolApi', {
    onWindowWallpaper() {}, registerGlobalShortcut() {}, windowControls() {}, resizeWindow() {},
    getPendingData: async () => ({ conversation }), sendWindowInfo() {}, createNewWindow() {}
})
contextBridge.exposeInMainWorld('wsApi', {
    onMessage: callback => ipcRenderer.on('fixture:voice-frame', (_event, type, data) => callback(type, data)),
    sendMessage: (type, sequence, message) => ipcRenderer.send('fixture:voice-ws', type, message)
})
contextBridge.exposeInMainWorld('uploadFileApi', {
    saveVoiceRecording: recording => ipcRenderer.invoke('fixture:voice-save', recording),
    uploadFile: file => ipcRenderer.invoke('fixture:voice-upload', file),
    updateUploadProgress() {}, updateUploadStatus: callback => ipcRenderer.on('upload-loadStatus', callback),
    updateDownloadProgress() {}, updateDownloadStatus() {},
    listWorkspaces: async () => []
})
contextBridge.exposeInMainWorld('dbApi', {
    queryConversationList: async () => [conversation], queryFriendList: async () => [],
    updateConversation: async () => {}, saveLoadMessage: async () => {},
    saveSentMessage: message => ipcRenderer.invoke('fixture:voice-persist', message),
    updateMessageInfo: async () => {},
    getImageUrlList: async () => [], getVideoUrlList: async () => [],
    loadMessage: async () => ({ dataList: [
        { id: 'fixture-message-1', conversationId: 'fixture-chat', senderId: 'fixture-friend', receiverId: 'fixture-user', msgType: 1, content: '今天的天空很好看，分享给你。', sendTime: '2026-10-26T11:00:00', sendStatus: 1 },
        { id: 'fixture-message-2', conversationId: 'fixture-chat', senderId: 'fixture-user', receiverId: 'fixture-friend', msgType: 1, content: '把这一刻留在对话里 ☁', sendTime: '2026-10-26T11:01:00', sendStatus: 1 }
    ], pageTotal: 1, pageNO: 1 }),
    getFriendInfoById: async () => ({ friendId: 'fixture-friend', username: '晴空', avatar }),
    getConversationInfoById: async () => conversation
})
contextBridge.exposeInMainWorld('piniaShareApi', { setStoreInfo() {}, sendStoreInfo() {} })
contextBridge.exposeInMainWorld('loadApi', {
    onDataInitSynced: callback => {
        const handler = (_event, result) => callback(result)
        ipcRenderer.on('data-init-synced', handler)
        return () => ipcRenderer.removeListener('data-init-synced', handler)
    },
    dataInitSuccessAndSkip: callback => {
        const handler = (_event, result) => callback(result)
        ipcRenderer.on('fixture:loaded', handler)
        return () => ipcRenderer.removeListener('fixture:loaded', handler)
    },
    loadFinish: () => ipcRenderer.send('fixture:continue')
})
