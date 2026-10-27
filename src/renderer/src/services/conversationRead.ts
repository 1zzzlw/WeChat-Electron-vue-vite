import { clearUnreadApi, markUnreadApi } from '@/api/Conversation'
import { updateConversation } from '@/db/dualDB'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { messageInfo } from '@/stores/modules/MessageStore'

// 同一会话的已读/手动未读请求顺序执行，避免迟到的清零覆盖手动标记。
const updates = new Map<string, Promise<void>>()
function enqueue(conversationId: string, operation: () => Promise<void>) {
  const task = (updates.get(conversationId) ?? Promise.resolve()).catch(() => {}).then(operation)
  updates.set(conversationId, task)
  void task.finally(() => { if (updates.get(conversationId) === task) updates.delete(conversationId) }).catch(() => {})
  return task
}

function requireSuccess(result: { code?: number; msg?: string }) {
  if (result.code !== 1) throw new Error(result.msg || '更新会话状态失败')
}

export function markConversationRead(conversationId: string) {
  if (!conversationId) return Promise.resolve()
  // 用字符串传递已展示的最大 ID。即使 MQ 尚未入库，也能阻止它再次增加未读。
  const ids = (messageInfo().messageMap[conversationId] || []).map(message => message.id)
    .filter(id => /^\d+$/.test(id))
  const maxMessageId = ids.reduce((max, id) => BigInt(id) > BigInt(max) ? id : max, '0')
  return enqueue(conversationId, async () => {
    conversationInfo().clearUnreadCount(conversationId)
    await updateConversation({ id: conversationId }, { unreadCount: 0 })
    requireSuccess(await clearUnreadApi(conversationId, maxMessageId === '0' ? undefined : maxMessageId))
  })
}

export function markConversationUnread(conversationId: string) {
  return enqueue(conversationId, async () => {
    const result = await markUnreadApi(conversationId)
    requireSuccess(result)
    const store = conversationInfo()
    const unreadCount = Math.max(1, Number(result.data) || 0, Number(store.conversationMap[conversationId]?.unreadCount) || 0)
    store.setConversationMap(conversationId, { unreadCount })
    await updateConversation({ id: conversationId }, { unreadCount })
  })
}
