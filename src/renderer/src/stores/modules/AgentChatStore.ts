import { acceptHMRUpdate, defineStore } from 'pinia'
import { DEFAULT_MODEL } from '@/types/agentModel'
import type { AgentMessage } from '@/types/agentChat'

export const useAgentChatStore = defineStore('agentChat', {
  state: () => ({
    userId: '',
    conversationId: '',
    messages: [] as AgentMessage[],
    draft: '',
    selectedModel: DEFAULT_MODEL.id,
    isSending: false
  }),
  actions: {
    bindUser(userId: string) {
      if (this.userId === userId) return
      this.$reset()
      this.userId = userId
    },
    loadHistory(messages: AgentMessage[], conversationId: string) {
      this.messages = messages
      this.conversationId = conversationId
    },
    ensureConversation() {
      this.conversationId ||= crypto.randomUUID()
      return this.conversationId
    },
    appendReply(messageId: string, delta: string) {
      let message = this.messages.find((item) => item.id === messageId)
      if (!message) {
        message = {
          id: messageId,
          role: 'assistant',
          content: '',
          status: 'streaming',
          createdAt: Date.now()
        }
        this.messages.push(message)
      }
      message.content += delta
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAgentChatStore, import.meta.hot))
}
