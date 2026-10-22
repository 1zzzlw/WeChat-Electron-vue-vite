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
  workspaceName?: string
  config: AgentModelRequestConfig
}

export type AIWorkspaceToolOperation = 'list' | 'read' | 'write' | 'edit' | 'delete' | 'search' | 'command'

export interface AIWorkspaceToolRequest {
  toolCallId: string
  workspaceName: string
  operation: AIWorkspaceToolOperation
  path?: string
  depth?: number
  pattern?: string
  glob?: string
  useRegex?: boolean
  maxResults?: number
  command?: string
  args?: string[]
  timeoutSeconds?: number
  startLine?: number
  endLine?: number
  content?: string
  oldText?: string
  newText?: string
  replaceAll?: boolean
}

export interface AIWorkspaceToolExecutionResult {
  success: boolean
  content?: string
}

export interface AIWorkspaceToolCompletedData {
  toolCallId: string
  workspaceName: string
  toolName: string
  success: boolean
}

export interface SubmitAIWorkspaceToolResultRequest {
  toolCallId: string
  workspaceName: string
  userId: string
  success: boolean
  content?: string
  error?: string
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
  onToolRequest?: (data: AIWorkspaceToolRequest) => void | Promise<void>
  onToolCompleted?: (data: AIWorkspaceToolCompletedData) => void
  onDone?: (data: AIStreamDoneData) => void
}
