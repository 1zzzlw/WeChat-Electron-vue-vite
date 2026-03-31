export interface userApplyInfo {
    applyId: string | number
    fromUserId: string | number
    username: string
    avatar: string
    account: string
    gender: number
    phone: string
    email: string
    birthday: string
    address: string
    applyMsg: string
    isDealt: number
    dealResult: number
}

export interface groupApplyInfo {
    id: string
    conversationId: string
    userId: string | number
    userAvatar: string
    groupName: string
    status: number
}