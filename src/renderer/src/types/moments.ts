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
    likers: Like[]
}

// 评论回复
interface CommentReply {
    id: number
    username: string
    replyTo: string
    content: string
}

// 单条评论
interface Comment {
    id: number
    userId: number
    username: string
    avatar: string
    content: string
    publishTime: string
    liked: boolean
    likeCount: number
    replies: CommentReply[]
}

interface Like {
    id: number
    avatar: string
    username: string
}