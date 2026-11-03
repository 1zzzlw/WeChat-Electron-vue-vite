export type AgentMessageStatus = 'sending' | 'streaming' | 'completed' | 'failed'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: AgentMessageStatus
  createdAt: number
}

export interface AgentServiceStatus {
  available: boolean
  code?: string
  message?: string
}
