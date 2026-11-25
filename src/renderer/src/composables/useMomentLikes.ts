import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { likedApi } from '@/api/Moments'
import type { MomentsItem } from '@/types/moments'

export function useMomentLikes() {
  const liking = ref(new Set<string>())

  async function toggleLike(post: MomentsItem) {
    const id = String(post.id)
    if (liking.value.has(id)) return
    liking.value.add(id)
    const { liked, likeCount } = post
    post.liked = !liked
    post.likeCount = Math.max(0, (likeCount ?? 0) + (liked ? -1 : 1))
    try {
      const result = await likedApi(id)
      if (result.code !== 1) throw new Error(result.msg || '点赞操作失败，请重试')
    } catch (error) {
      post.liked = liked
      post.likeCount = likeCount
      ElMessage.error(error instanceof Error ? error.message : '点赞操作失败，请重试')
    } finally {
      liking.value.delete(id)
    }
  }

  return { liking, toggleLike }
}
