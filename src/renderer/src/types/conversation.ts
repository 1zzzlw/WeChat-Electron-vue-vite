export interface Conversation {
    id: string
    userId: number
    targetId: string
    name?: string
    avatar?: string
    remark?: string
    type: number
    isTop?: number
    unreadCount?: number
    latestMsg?: string
    latestMsgTime?: number | string
    status: number
    createTime?: number
    updateTime?: number
}

