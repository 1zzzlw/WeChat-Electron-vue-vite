export interface AgentModelRequestConfig {
  providerName: string
  modelName?: string
  apiKey?: string
  baseUrl?: string
  modelTemperature?: number
  enableThink?: boolean
  configId?: number
}

export interface SendAIMessageRequest {
  id?: string
  conversationId: string
  userId: string
  role: 'user'
  messageType: number
  content: string
  imageUrl?: string
  personalityId?: string
  config: AgentModelRequestConfig
}

export interface SavedAIMessage {
  id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  messageType: number
  content: string
  imageUrl: string | null
  personalityId: string | null
  configId: number | null
  createdAt: string
}

export interface SavedAIConversation {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface AIStreamStartedData {
  conversationId: string
  clientMessageId: string | null
}

export interface AIStreamDeltaData {
  delta: string
}

export interface AIStreamReasoningDeltaData {
  delta: string
}

export interface AIStreamCompletedData {
  messageId: string
  content: string
  reasoningContent: string
}

export interface AIStreamDoneData {
  conversationId: string
}

export interface AIStreamHandlers {
  onStarted?: (data: AIStreamStartedData) => void
  onReasoningDelta?: (delta: string, data: AIStreamReasoningDeltaData) => void
  onDelta?: (delta: string, data: AIStreamDeltaData) => void
  onCompleted?: (data: AIStreamCompletedData) => void
  onDone?: (data: AIStreamDoneData) => void
}
