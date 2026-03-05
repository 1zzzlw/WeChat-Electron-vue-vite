import { defineStore } from 'pinia'
import { AIMessage } from '../types/aiMessage'

export const aiMessageInfo = defineStore('aiMessageInfo', {
    state: () => {
        return {
            // 会话id当键，消息当值
            aiMessageMap: {} as Record<string, AIMessage[]>
        }
    },
    actions: {
        loadMessageMap(conversationId: string, message: AIMessage) {
            // 如果该会话ID还没有数组，先初始化一个空数组
            if (!this.aiMessageMap[conversationId]) {
                this.aiMessageMap[conversationId] = []
            }
            this.aiMessageMap[conversationId].unshift(message)
        },
        addMessageMap(conversationId: string, message: AIMessage) {
            // 如果该会话ID还没有数组，先初始化一个空数组
            if (!this.aiMessageMap[conversationId]) {
                this.aiMessageMap[conversationId] = []
            }
            this.aiMessageMap[conversationId].push(message)
        },
        updateAIMessageContent(conversationId: string, messageIndex: number, chunk: string) {
            if (this.aiMessageMap[conversationId]?.[messageIndex]) {
                this.aiMessageMap[conversationId][messageIndex].content += chunk
            }
        },
        clearMessageMap(conversationId: string) {
            this.aiMessageMap[conversationId] = []
        }
    }
})
