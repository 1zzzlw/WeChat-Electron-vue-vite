<template>
  <section class="friend-moments">
    <button class="section-heading" @click="openProfile" :disabled="!userId" title="查看个人主页">朋友圈 <span>›</span></button>
    <div v-if="loading" class="state-text">正在加载动态…</div>
    <div v-else-if="error" class="state-text">动态加载失败 <button @click="loadPreview">重试</button></div>
    <div v-else-if="posts.length === 0" class="state-text">暂无动态</div>
    <div v-else class="preview-row">
      <button v-for="post in posts" :key="post.id" class="preview-card" @click="openMomentDetail(post.id)"
        :title="post.preview.text || '图片动态'">
        <img v-if="post.preview.image" :src="post.preview.image" alt="动态图片" loading="lazy" @error="post.preview.image = ''" />
        <span v-else class="text-cover">{{ post.preview.text || '分享了一条动态' }}</span>
        <span v-if="post.preview.image && post.preview.text" class="image-caption">{{ post.preview.text }}</span>
      </button>
      <button v-if="total > 4" class="more-button" @click="openProfile" aria-label="查看全部动态" title="查看全部动态">
        <el-icon><MoreFilled /></el-icon>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
import { listUserMomentsApi } from '@/api/Moments'
import { momentPreview } from '@/utils/momentPresentation'
import { openUserMoments, openMomentDetail } from '@/utils/momentWindows'
import type { MomentProfile, UserMoment } from '@/types/userMoments'
import emitter from '@/utils/mitt'

const props = defineProps<{ userId?: string; profile?: MomentProfile }>()
const posts = ref<Array<UserMoment & { preview: ReturnType<typeof momentPreview> }>>([])
const total = ref(0)
const loading = ref(false)
const error = ref(false)
let requestVersion = 0

const openProfile = () => {
  if (props.userId) openUserMoments(props.userId, props.profile)
}

const loadPreview = async () => {
  const version = ++requestVersion
  posts.value = []
  total.value = 0
  error.value = false
  loading.value = !!props.userId
  if (!props.userId) return
  try {
    // 多取一条供“更多”判断；界面始终只显示四张卡片。
    const result = await listUserMomentsApi(props.userId, 1, 5)
    if (version !== requestVersion) return
    if (result.code !== 1 || !Array.isArray(result.data?.data)) throw new Error(result.msg || '加载失败')
    total.value = result.data.total
    posts.value = result.data.data.slice(0, 4).map(post => ({ ...post, preview: momentPreview(post.content) }))
  } catch {
    if (version === requestVersion) error.value = true
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

// 切换好友或跨窗口发布、修改、删除时，丢弃旧请求的结果。
watch(() => props.userId, loadPreview, { immediate: true })
onMounted(() => emitter.on('moments:updated', loadPreview))
onUnmounted(() => {
  requestVersion++
  emitter.off('moments:updated', loadPreview)
})
</script>

<style scoped>
.friend-moments { box-sizing: border-box; width: 100%; min-height: 140px; padding: 12px; background: rgba(var(--color-surface-rgb), .4); border-radius: 8px; }
button { font: inherit; color: var(--color-text-secondary); cursor: pointer; border: 0; }
.section-heading { display: flex; align-items: center; gap: 8px; padding: 0; margin-bottom: 10px; background: none; font-size: 13px; }
.section-heading span { color: var(--color-text-muted); font-size: 18px; }
.section-heading:hover, .state-text button:hover { color: var(--color-accent); }
.preview-row { display: flex; align-items: stretch; gap: 10px; height: 80px; }
.preview-card { flex: 1 1 0; min-width: 0; max-width: 145px; position: relative; padding: 0; overflow: hidden; border: 1px solid var(--color-border-subtle); border-radius: 8px; background: rgba(var(--color-accent-rgb), .08); text-align: left; transition: transform .2s, border-color .2s; }
.preview-card:hover { transform: translateY(-2px); border-color: var(--color-accent); }
.preview-card img { width: 100%; height: 100%; object-fit: cover; }
.text-cover { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 10px; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.image-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 7px 5px; background: linear-gradient(transparent, #000a); color: white; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.more-button { width: 34px; flex-shrink: 0; border-radius: 8px; background: rgba(var(--color-accent-rgb), .1); }
.more-button:hover { background: rgba(var(--color-accent-rgb), .23); }
.state-text { min-height: 75px; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); }
.state-text button { padding: 0; color: var(--color-accent); background: none; }
@media (prefers-reduced-motion: reduce) { .preview-card { transition: none; } }
</style>
