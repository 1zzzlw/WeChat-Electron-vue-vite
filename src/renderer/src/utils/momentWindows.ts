import type { MomentProfile } from '@/types/userMoments'

/** 不传作者时显示当前用户；所有入口共用同一个独立个人主页。 */
export const openUserMoments = (userId?: string | number, profile?: MomentProfile) => {
  ;(window as any).windowToolApi.createNewWindow('userMoments', {
    userId: userId == null ? undefined : String(userId),
    profile: profile ? { username: profile.username, avatar: profile.avatar, account: profile.account } : undefined
  })
}

export const openMomentDetail = (id: string) => {
  ;(window as any).windowToolApi.createNewWindow('momentInfoView', id)
}
