export type AgentMessageRole = 'user' | 'assistant'
export type AgentMessageStatus = 'pending' | 'streaming' | 'completed' | 'failed'
export type AgentToolStepStatus = 'pending' | 'running' | 'completed' | 'failed'
export type AgentMode = 'Agent' | '提问' | '规划'

export interface AgentToolStep {
  id: string
  title: string
  status: AgentToolStepStatus
  statusLabel: string
}

export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  reasoningContent?: string
  status: AgentMessageStatus
  createdAt: number
  toolSteps?: AgentToolStep[]
}

export interface AgentConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: AgentMessage[]
}

export interface AgentAttachment {
  id: string
  name: string
  size: number
  type: number
  localPath?: string
}
