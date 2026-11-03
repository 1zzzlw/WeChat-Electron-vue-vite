import type { Friend } from './friend'
import type { Conversation } from './conversation'

export interface LocalMessageMatch {
  id: string
  conversationId: string
  content?: string
  fileName?: string
  sendTime: string
  msgType: number
  conversationName: string
  conversationRemark?: string
  conversationAvatar?: string
  conversationType: number
}

export interface LocalSearchResults {
  contacts: Friend[]
  conversations: Conversation[]
  messages: LocalMessageMatch[]
}
