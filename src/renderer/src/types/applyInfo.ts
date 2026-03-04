export interface userApplyInfo {
    applyId: string | number
    fromUserId: string | number
    username: string
    avatar: string
    account: string
    gender: string
    phone: string
    email: string
    birthday: string
    address: string
    applyMsg: string
    isDealt: 0 | 1
    dealResult: 0 | 1
}

export interface groupApplyInfo {
    conversationId: string
    userId: string | number
    userAvatar: string
    groupName: string
    status: number
}