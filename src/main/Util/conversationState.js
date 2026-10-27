import { BrowserWindow } from 'electron'

// 只在一个窗口真正聚焦且正在查看该会话时，收到的消息才立即视为已读。
const activeConversations = new Map()

export function setActiveConversation(contents, conversationId) {
    if (!activeConversations.has(contents.id)) {
        contents.once('destroyed', () => activeConversations.delete(contents.id))
    }
    activeConversations.set(contents.id, conversationId || null)
}

export function isConversationVisible(conversationId) {
    return BrowserWindow.getAllWindows().some(window => !window.isDestroyed() &&
        window.isFocused() && !window.isMinimized() &&
        activeConversations.get(window.webContents.id) === conversationId)
}

export function broadcastConversationUpdate(conversationId, changes) {
    for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.webContents.send('conversation:updated', conversationId, changes)
    }
}
