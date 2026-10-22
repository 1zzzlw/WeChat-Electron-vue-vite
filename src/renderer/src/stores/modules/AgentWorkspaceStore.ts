import { acceptHMRUpdate, defineStore } from 'pinia'
import { DEFAULT_MODEL } from '@/types/agentModel'
import type {
  AgentAttachment,
  AgentConversation,
  AgentMessage,
  AgentMode,
  AgentToolStep
} from '@/types/agentWorkspace'

const createId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useAgentWorkspaceStore = defineStore('agentWorkspace', {
  state: () => ({
    conversations: [] as AgentConversation[],
    activeConversationId: null as string | null,
    draft: '',
    attachments: [] as AgentAttachment[],
    selectedModel: DEFAULT_MODEL.id,
    selectedMode: 'Agent' as AgentMode,
    selectedWorkspace: null as string | null,
    selectedBranch: 'main',
    isGenerating: false
  }),
  getters: {
    activeConversation(state): AgentConversation | undefined {
      return state.conversations.find((conversation) => conversation.id === state.activeConversationId)
    },
    activeMessages(state): AgentMessage[] {
      return state.conversations.find((conversation) => conversation.id === state.activeConversationId)?.messages ?? []
    }
  },
  actions: {
    setConversations(conversations: AgentConversation[]) {
      this.conversations = conversations
      const activeExists = conversations.some(
        (conversation) => conversation.id === this.activeConversationId
      )
      if (!activeExists) this.activeConversationId = conversations[0]?.id ?? null
    },
    createNewTask() {
      this.activeConversationId = null
      this.draft = ''
      this.attachments = []
      this.isGenerating = false
    },
    selectConversation(conversationId: string) {
      this.activeConversationId = conversationId
      this.attachments = []
    },
    ensureConversation(firstContent: string) {
      const activeConversation = this.conversations.find(
        (conversation) => conversation.id === this.activeConversationId
      )

      if (activeConversation) return activeConversation.id

      const conversationId = createId('conversation')
      const now = Date.now()
      const title = firstContent.trim().replace(/\s+/g, ' ').slice(0, 24) || '新的对话'

      this.conversations.unshift({
        id: conversationId,
        title,
        createdAt: now,
        updatedAt: now,
        messages: []
      })
      this.activeConversationId = conversationId
      return conversationId
    },
    addUserMessage(conversationId: string, content: string) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      if (!conversation) return

      conversation.messages.push({
        id: createId('message'),
        role: 'user',
        content,
        status: 'completed',
        createdAt: Date.now()
      })
      conversation.updatedAt = Date.now()
    },
    addAssistantPlaceholder(conversationId: string, showToolSteps = true) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      if (!conversation) return ''

      const messageId = createId('message')
      conversation.messages.push({
        id: messageId,
        role: 'assistant',
        content: '',
        reasoningContent: '',
        status: 'streaming',
        createdAt: Date.now(),
        toolSteps: showToolSteps
          ? [
            {
              id: createId('step'),
              title: '分析请求与上下文',
              status: 'running',
              statusLabel: '进行中'
            }
          ]
          : undefined
      })
      conversation.updatedAt = Date.now()
      this.isGenerating = true
      return messageId
    },
    appendAssistantContent(conversationId: string, messageId: string, content: string) {
      const message = this.conversations
        .find((conversation) => conversation.id === conversationId)
        ?.messages.find((item) => item.id === messageId)

      if (message) message.content += content
    },
    appendAssistantReasoning(conversationId: string, messageId: string, content: string) {
      const message = this.conversations
        .find((conversation) => conversation.id === conversationId)
        ?.messages.find((item) => item.id === messageId)

      if (message) message.reasoningContent = (message.reasoningContent ?? '') + content
    },
    setAssistantContent(conversationId: string, messageId: string, content: string) {
      const message = this.conversations
        .find((conversation) => conversation.id === conversationId)
        ?.messages.find((item) => item.id === messageId)

      if (message) message.content = content
    },
    setAssistantReasoning(conversationId: string, messageId: string, content: string) {
      const message = this.conversations
        .find((conversation) => conversation.id === conversationId)
        ?.messages.find((item) => item.id === messageId)

      if (message) message.reasoningContent = content
    },
    startToolStep(conversationId: string, messageId: string, toolStep: AgentToolStep) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      const message = conversation?.messages.find((item) => item.id === messageId)
      if (!conversation || !message) return

      message.toolSteps ??= []
      message.toolSteps.forEach((step) => {
        if (step.status === 'running') {
          step.status = 'completed'
          step.statusLabel = '已完成'
        }
      })

      const existingStep = message.toolSteps.find((step) => step.id === toolStep.id)
      if (existingStep) {
        Object.assign(existingStep, toolStep)
      } else {
        message.toolSteps.push(toolStep)
      }
      conversation.updatedAt = Date.now()
    },
    finishToolStep(
      conversationId: string,
      messageId: string,
      toolCallId: string,
      success: boolean
    ) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      const message = conversation?.messages.find((item) => item.id === messageId)
      const toolStep = message?.toolSteps?.find((step) => step.id === toolCallId)
      if (!conversation || !toolStep) return

      toolStep.status = success ? 'completed' : 'failed'
      toolStep.statusLabel = success ? '已完成' : '执行失败'
      conversation.updatedAt = Date.now()
    },
    completeAssistantMessage(conversationId: string, messageId: string) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      const message = conversation?.messages.find((item) => item.id === messageId)
      if (!conversation || !message) return

      message.status = 'completed'
      message.toolSteps?.forEach((step) => {
        if (step.status === 'running' || step.status === 'pending') {
          step.status = 'completed'
          step.statusLabel = '已完成'
        }
      })
      conversation.updatedAt = Date.now()
      this.isGenerating = false
    },
    failAssistantMessage(conversationId: string, messageId: string, errorMessage: string) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      const message = conversation?.messages.find((item) => item.id === messageId)
      if (!conversation || !message) return

      message.content = errorMessage
      message.status = 'failed'
      message.toolSteps?.forEach((step) => {
        if (step.status === 'running' || step.status === 'pending') {
          step.status = 'failed'
          step.statusLabel = '请求失败'
        }
      })
      conversation.updatedAt = Date.now()
      this.isGenerating = false
    },
    stopGenerating(conversationId?: string, messageId?: string) {
      const conversation = this.conversations.find(
        (item) => item.id === (conversationId ?? this.activeConversationId)
      )
      const message = messageId
        ? conversation?.messages.find((item) => item.id === messageId)
        : conversation?.messages.at(-1)
      if (message?.status === 'streaming') {
        message.status = 'completed'
        message.toolSteps?.forEach((step) => {
          if (step.status === 'running' || step.status === 'pending') {
            step.status = 'failed'
            step.statusLabel = '已停止'
          }
        })
      }
      this.isGenerating = false
    },
    renameConversation(conversationId: string, title: string) {
      const conversation = this.conversations.find((item) => item.id === conversationId)
      if (!conversation || !title.trim()) return
      conversation.title = title.trim().slice(0, 40)
      conversation.updatedAt = Date.now()
    },
    deleteConversation(conversationId: string) {
      this.conversations = this.conversations.filter((conversation) => conversation.id !== conversationId)
      if (this.activeConversationId === conversationId) this.createNewTask()
    },
    clearConversations() {
      this.conversations = []
      this.createNewTask()
    },
    addAttachment(attachment: AgentAttachment) {
      if (this.attachments.some((item) => item.id === attachment.id)) return
      this.attachments.push(attachment)
    },
    removeAttachment(attachmentId: string) {
      this.attachments = this.attachments.filter((attachment) => attachment.id !== attachmentId)
    },
    clearAttachments() {
      this.attachments = []
    },
    setModel(model: string) {
      this.selectedModel = model
    },
    setMode(mode: AgentMode) {
      this.selectedMode = mode
    },
    setWorkspace(workspaceName: string) {
      this.selectedWorkspace = workspaceName
    },
    setBranch(branch: string) {
      this.selectedBranch = branch
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAgentWorkspaceStore, import.meta.hot))
}
