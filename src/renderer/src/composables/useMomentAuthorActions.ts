import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { sendApplyApi } from '@/api/Apply'
import { getFriendIdsApi } from '@/api/Friend'
import { addConversation, getConversationInfoById } from '@/db/dualDB'
import type { MomentsItem } from '@/types/moments'

const applyMsg = '来自频道帖子'

export function useMomentAuthorActions() {
  const ownUserId = ref('')
  const ready = ref(false)
  const friendIds = ref(new Set<string>())
  const pending = ref(new Set<string>())
  const sent = ref(new Set<string>())
  let refreshVersion = 0

  async function fetchFriendIds() {
    const result = await getFriendIdsApi()
    if (result.code !== 1 || !Array.isArray(result.data)) {
      throw new Error(result.msg || '好友关系读取失败，请稍后重试')
    }
    return new Set(result.data)
  }

  async function refreshFriends() {
    const version = ++refreshVersion
    try {
      const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
      if (version !== refreshVersion) return
      ownUserId.value = String(userId ?? '')
      const ids = await fetchFriendIds()
      if (version !== refreshVersion) return
      friendIds.value = ids
      ready.value = true
      for (const id of friendIds.value) sent.value.delete(id)
    } catch {
      // 下次窗口获得焦点时再刷新，保留已加载的好友状态。
    }
  }

  onMounted(() => {
    void refreshFriends()
    window.addEventListener('focus', refreshFriends)
  })
  onUnmounted(() => {
    refreshVersion++
    window.removeEventListener('focus', refreshFriends)
  })

  function labelFor(authorId: string | number | undefined) {
    const id = String(authorId ?? '')
    if (!ready.value || !/^\d+$/.test(id) || !ownUserId.value || id === ownUserId.value) return ''
    if (friendIds.value.has(id)) return '私信'
    return sent.value.has(id) ? '已申请' : '加好友'
  }

  async function activate(author: Pick<MomentsItem, 'userId' | 'username' | 'avatar'>) {
    const id = String(author.userId)
    const userId = ownUserId.value
    const label = labelFor(id)
    if (!label || label === '已申请' || pending.value.has(id)) return
    pending.value.add(id)
    try {
      friendIds.value = await fetchFriendIds()
      if (friendIds.value.has(id)) {
        sent.value.delete(id)
        const conversationId = BigInt(userId) > BigInt(id) ? `${userId}_${id}` : `${id}_${userId}`
        const local = await getConversationInfoById(conversationId)
        const conversation = local ? { ...local, targetId: id } : {
          id: conversationId,
          userId,
          targetId: id,
          type: 0,
          name: author.username,
          avatar: author.avatar,
          status: 0
        }
        if (!local) await addConversation(conversation)
        ;(window as any).windowToolApi.createNewWindow('standaloneChat', { conversation })
        return
      }
      if (label === '私信') {
        ElMessage.info('好友关系已更新')
        return
      }
      const result = await sendApplyApi({
        toUserId: id,
        applyMsg
      })
      if (result.code !== 1) throw new Error(result.msg || '好友申请发送失败')
      sent.value.add(id)
      ;(window as any).wsApi.sendMessage(5, 0, { applyId: result.data, toUserId: id, applyMsg })
      ElMessage.success('好友申请已发送')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '操作失败，请稍后重试')
    } finally {
      pending.value.delete(id)
    }
  }

  return { ownUserId, labelFor, pending, activate }
}
