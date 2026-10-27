export interface MomentProfile {
  username?: string
  avatar?: string
  account?: string
}

export interface UserMomentsWindowData {
  userId?: string
  profile?: MomentProfile
}

export interface UserMoment {
  id: string
  userId: string
  username: string
  avatar: string
  content: string
  publishTime: string
  likeCount: number
  commentCount: number
}
