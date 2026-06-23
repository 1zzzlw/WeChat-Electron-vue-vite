// 朋友圈单条数据
export interface MomentsItem {
    id: number
    userId: number
    username: string
    avatar: string
    publishTime: string
    content: string
    liked: boolean
    likeCount: number
    commentCount: number
    isFollowed: boolean
    showComments: boolean
    comments: Comment[]
    rewardAmount: number
    likers: Like[]
}

// 一级评论
export interface Comment {
    id: number
    momentId: number
    userId: number
    username: string
    avatar: string
    content: string
    publishTime: string
    parentId: number
    liked: boolean
    likeCount: number
    replyToUserId?: number
    replyToUsername?: string
    replies: Reply[]
}

// 二级评论（回复）
export interface Reply {
    id: number
    momentId: number
    userId: number
    username: string
    avatar: string
    content: string
    publishTime: string
    parentId: number
    replyToUserId: number
    replyToUsername: string
    likeCount: number
}

export interface Like {
    id: number
    avatar: string
    username: string
}