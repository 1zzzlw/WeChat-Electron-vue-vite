import type { Component } from 'vue'
import type { AgentConversation, AgentMode } from '@/types/agentWorkspace'

export interface AgentConversationGroup {
  key: string
  label: string
  showMenu?: boolean
  items: AgentConversation[]
}

export interface AgentSuggestion {
  id: string
  title: string
  description: string
  prompt: string
  icon: Component
}

export interface AgentWorkspaceOption {
  id: string
  name: string
  path: string
}

export interface AgentModeOption {
  value: AgentMode
  label: string
  description: string
}

export interface AgentDropdownItem {
  value: string
  label: string
  description?: string
  icon?: Component
  danger?: boolean
  divided?: boolean
  disabled?: boolean
}

export type AgentDropdownPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'

export type ConversationAction = 'rename' | 'delete' | 'clear'

export interface ConversationActionDialogState {
  visible: boolean
  action: ConversationAction
  conversationId: string
  title: string
  description: string
  confirmText: string
  initialValue: string
  placeholder: string
}

export interface AgentSimulationState {
  conversationId: string
  messageId: string
}
