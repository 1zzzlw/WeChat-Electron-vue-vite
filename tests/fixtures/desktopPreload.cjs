const { contextBridge, ipcRenderer } = require('electron')

let fixtureStyle = ipcRenderer.sendSync('fixture:style:initial')
window.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.uiStyle = fixtureStyle }, { once: true })
ipcRenderer.on('fixture:style:changed', (_event, value) => {
    fixtureStyle = value
    document.documentElement.dataset.uiStyle = value
})
let fixtureTheme = ipcRenderer.sendSync('fixture:theme:initial')
window.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = fixtureTheme }, { once: true })
ipcRenderer.on('fixture:theme:changed', (_event, value) => {
    fixtureTheme = value
    document.documentElement.dataset.theme = value
})
contextBridge.exposeInMainWorld('themeApi', {
    getStyle: () => ipcRenderer.invoke('fixture:style:get'),
    setStyle: value => ipcRenderer.invoke('fixture:style:set', value),
    onStyleChanged: callback => {
        const handler = (_event, value) => callback(value)
        ipcRenderer.on('fixture:style:changed', handler)
        return () => ipcRenderer.removeListener('fixture:style:changed', handler)
    },
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
const groupFriends = Array.from({ length: 5 }, (_, index) => ({ friendId: 'group-friend-' + index, username: ['陈一', '林小满', '周安', '许知远', '产品设计讨论组联系人'][index], remark: index === 1 ? '小满 · 设计' : '', avatar }))
const historyMessages = Array.from({ length: 41 }, (_, index) => ({ id: 'history-' + String(index).padStart(3, '0'), conversationId: 'fixture-chat', senderId: 'fixture-friend', receiverId: 'fixture-user', msgType: 1, content: '历史消息 ' + index + '：本地设计讨论', sendTime: '2026-10-01T10:' + String(index).padStart(2, '0') + ':00', sendStatus: 1 }))
const conversation = { id: 'fixture-chat', userId: 'fixture-user', targetId: 'fixture-friend', type: 0,
    name: '晴空', avatar, remark: '', isTop: 0, isMute: 0, unreadCount: 0, status: 1,
    latestMsg: '今天的天空很好看', latestMsgTime: '2026-10-26T11:00:00' }
contextBridge.exposeInMainWorld('userInfoApi', {
    onProfileChanged: () => () => {},
    storeGetUserInfo: async key => ({ token: 'fixture-only', userId: location.hash.startsWith('#/friendAdd') ? '200' : 'fixture-user', username: '天空', avatar })[key],
    storeSetUserInfo: async (key, value) => ipcRenderer.send('fixture:profile:set', key, value)
})
contextBridge.exposeInMainWorld('windowToolApi', {
    registerGlobalShortcut() {}, windowControls() {}, resizeWindow() {},
    getPendingData: async () => location.hash.startsWith('#/updateMomentView') ? { id: 'fixture-post', content: '<p>已有动态内容</p>' } : ({ conversation: location.search.includes('group=1') ? { ...conversation, id: 'fixture-group', type: 1, name: '设计讨论组' } : conversation }), sendWindowInfo() {},
    createNewWindow: (type, data) => ipcRenderer.send('fixture:new-window', type, data)
})
contextBridge.exposeInMainWorld('wsApi', {
    getConnectionStatus: async () => 3,
    onConnectionStatus: callback => {
        const handler = (_event, value) => callback(value)
        ipcRenderer.on('fixture:ws-status', handler)
        return () => ipcRenderer.removeListener('fixture:ws-status', handler)
    },
    onMessage: callback => ipcRenderer.on('fixture:voice-frame', (_event, type, data) => callback(type, data)),
    sendMessage: (type, sequence, message) => ipcRenderer.send('fixture:voice-ws', type, message)
})
contextBridge.exposeInMainWorld('uploadFileApi', {
    selectFile: () => ipcRenderer.invoke('fixture:select-file'),
    saveVoiceRecording: recording => ipcRenderer.invoke('fixture:voice-save', recording),
    uploadFile: file => ipcRenderer.invoke('fixture:voice-upload', file),
    updateUploadProgress() {}, updateUploadStatus: callback => ipcRenderer.on('upload-loadStatus', callback),
    updateDownloadProgress() {}, updateDownloadStatus() {},
})
contextBridge.exposeInMainWorld('dbApi', {
    searchLocal: request => ipcRenderer.invoke('fixture:search-local', request),
    queryConversationList: async () => [conversation], queryFriendList: async () => location.hash.startsWith('#/createGroup') ? groupFriends : [],
    updateConversation: async () => {}, saveLoadMessage: async () => {},
    saveSentMessage: message => ipcRenderer.invoke('fixture:voice-persist', message),
    updateMessageInfo: async () => {},
    getImageUrlList: async () => [], getVideoUrlList: async () => [],
    loadMessage: async (_conversationId, pageInfo) => ({ dataList: pageInfo.anchorMessageId ? historyMessages : [
        { id: 'fixture-message-1', conversationId: 'fixture-chat', senderId: 'fixture-friend', receiverId: 'fixture-user', msgType: 1, content: '今天的天空很好看，分享给你。', sendTime: '2026-10-26T11:00:00', sendStatus: 1 },
        { id: 'fixture-message-2', conversationId: 'fixture-chat', senderId: 'fixture-user', receiverId: 'fixture-friend', msgType: 1, content: '把这一刻留在对话里 ☁', sendTime: '2026-10-26T11:01:00', sendStatus: 1 }
    ], anchorFound: pageInfo.anchorMessageId === 'history-020', pageTotal: 1, pageNO: 1 }),
    getFriendInfoById: async () => ([{ friendId: 'fixture-friend', username: '晴空', remark: '设计伙伴', account: 'qingkong01', avatar, gender: 1, phone: '13800000000', email: 'friend@example.test', relationStatus: 1 }]),
    getConversationInfoById: async () => [conversation]
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
