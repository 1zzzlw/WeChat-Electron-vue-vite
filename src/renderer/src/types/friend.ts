export interface Friend {
    userId: number
    username: string
    account?: string
    friendId: number | string
    avatar: string
    remark?: string
    gender?: number
    phone?: string
    email?: string
    birthday?: string
    address?: string
    relationStatus: number
    isOnline?: boolean
}