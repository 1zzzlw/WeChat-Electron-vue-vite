import { defineStore } from 'pinia'
import { Personality } from '@/types/personality'

export const aiPersonalityInfo = defineStore('aiPersonalityInfo', {
    state: () => {
        return {
            // 会话id当键，消息当值
            aiPersonalityMap: {} as Record<string, Personality>
        }
    },
    actions: {
        addPersonality(id: string, personalityInfo: Personality) {
            this.aiPersonalityMap = {
                ...this.aiPersonalityMap,
                [id]: {
                    ...(this.aiPersonalityMap[id] || {}),
                    ...personalityInfo
                }
            };
        },
        getPersonality(id: string) {
            if (this.aiPersonalityMap[id]) {
                return this.aiPersonalityMap[id]
            }
        },
        switchPersonality(id: string) {
            // 取消所有激活状态
            Object.keys(this.aiPersonalityMap).forEach(key => {
                this.aiPersonalityMap[key].isActive = 0;
            });

            // 激活指定的
            if (this.aiPersonalityMap[id]) {
                this.aiPersonalityMap[id].isActive = 1;
            }
        },
        // 删除角色信息
        removePersonality(id: string) {
            const newMap = { ...this.aiPersonalityMap };
            delete newMap[id];
            this.aiPersonalityMap = newMap;
        },
    }
})
