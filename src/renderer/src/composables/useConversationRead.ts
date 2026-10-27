import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { markConversationRead } from '@/services/conversationRead'
import type { Message } from '@/types/message'

/** 打开会话、回到前台及收到新消息时清零；未聚焦的后台窗口不自动已读。 */
export function useConversationRead(conversationId: Ref<string>, messages: Ref<Message[]>) {
  const visible = () => document.visibilityState !== 'hidden' && document.hasFocus()
  const setActive = (id: string | null) => (window as any).dbApi.setActiveConversation?.(id)
  const report = () => {
    const id = conversationId.value
    setActive(visible() ? id : null)
    if (id && visible()) {
      void markConversationRead(id).catch(error => console.warn('同步会话已读失败', error.message))
    }
  }
  watch(conversationId, report, { flush: 'post' })
  watch(() => messages.value.at(-1)?.id, report, { flush: 'post' })
  onMounted(() => {
    report()
    window.addEventListener('focus', report)
    window.addEventListener('blur', report)
    document.addEventListener('visibilitychange', report)
  })
  onBeforeUnmount(() => {
    setActive(null)
    window.removeEventListener('focus', report)
    window.removeEventListener('blur', report)
    document.removeEventListener('visibilitychange', report)
  })
}
