export interface AgentModelRequestConfig {
  providerName: string
  modelName?: string
  apiKey?: string
  baseUrl?: string
  modelTemperature?: number
  configId?: string
}

export interface SendAIMessageRequest {
  id: string
  conversationId: string
  userId: string
  role: 'user'
  messageType: 1
  content: string
  assetIds?: string[]
  config: AgentModelRequestConfig
}

export interface SavedAIMessage {
  id: string
  seq?: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  messageType: number
  content: string
  parts?: { parts: Array<{ type: string; text?: string; assetId?: string }> }
  imageUrl: string | null
  personalityId: string | null
  configId: string | null
  createdAt: string
}

export interface AIStreamStartedData {
  conversationId: string
  clientMessageId: string | null
}

export interface AIStreamCompletedData {
  messageId: string
  content: string
  parts?: { parts: Array<{ type: string; text?: string; assetId?: string }> }
}

export interface AIStreamHandlers {
  onStarted?: (data: AIStreamStartedData) => void
  onDelta?: (delta: string) => void
  onCompleted?: (data: AIStreamCompletedData) => void
}
