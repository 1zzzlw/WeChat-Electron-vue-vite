export interface Conversation {
    id: string
    userId?: number
    targetId?: string
    name?: string
    avatar?: string
    remark?: string
    type?: number
    isTop?: number
    isMute?: number
    unreadCount?: number
    latestMsg?: string
    latestMsgTime?: number | string
    status?: number
    createTime?: number
    updateTime?: number
}

/**
 * 初始化 Conversation 对象的工具函数
 * @param defaultId 必传的 id（接口要求必填），默认值为空字符串
 * @returns 带默认值的 Conversation 对象
 */
export function initConversation(defaultId: string = ''): Conversation {
    return {
        id: defaultId,
        // 以下可选属性设业务常用默认值，也可根据需求调整
        userId: 0,
        targetId: '',
        name: '',
        avatar: '',
        remark: '',
        type: 0, // 0=单聊，1=群聊
        isTop: 0, // 0=未置顶，1=置顶
        unreadCount: 0,
        latestMsg: '',
        latestMsgTime: '',
        status: 0, // 0=显示，1=隐藏
        createTime: 0,
        updateTime: 0
    }
}
