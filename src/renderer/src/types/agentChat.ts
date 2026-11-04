export type AgentMessageStatus = 'sending' | 'streaming' | 'completed' | 'failed'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parts?: { parts: Array<{ type: string; text?: string; assetId?: string }> }
  status: AgentMessageStatus
  createdAt: number
}

export interface AgentServiceStatus {
  available: boolean
  code?: string
  message?: string
}
