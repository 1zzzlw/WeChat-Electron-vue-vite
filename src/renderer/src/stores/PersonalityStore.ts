import { defineStore } from 'pinia'
import { Personality } from '../types/personality'

export const aiPersonalityInfo = defineStore('aiPersonalityInfo', {
    state: () => {
        return {
            // 会话id当键，消息当值
            aiPersonalityList: [] as Personality[]
        }
    },
    actions: {
        addPersonality(personalityInfo: Personality) {
            this.aiPersonalityList.push(personalityInfo)
        }
    }
})
