<template>
  <div class="profile-window">
    <header class="window-header"><span>{{ isOwn ? '我的主页' : '个人主页' }}</span></header>
    <WindowControls window-type="userMoments" />
    <main class="profile-scroll">
      <section class="profile-hero">
        <div class="hero-cover"></div>
        <div class="profile-info">
          <img v-if="profile.avatar" class="profile-avatar" :src="profile.avatar" alt="头像" />
          <div v-else class="avatar-placeholder">{{ displayName.slice(0, 1) }}</div>
          <div class="profile-description">
            <span class="profile-label">{{ isOwn ? '记录我的日常' : '看看 TA 的日常' }}</span>
            <h1>{{ displayName }}</h1>
            <p v-if="profile.account">账号 {{ profile.account }}</p>
            <p v-else>用户 ID {{ targetId }}</p>
          </div>
          <button v-if="isOwn" class="primary-button publish-button" @click="publishPost"><el-icon><Plus /></el-icon> 发布动态</button>
        </div>
        <div class="profile-summary"><strong>{{ total }}</strong><span>条动态</span><span class="summary-divider"></span><span>分享生活，留下此刻</span></div>
      </section>

      <section class="works-section">
        <div class="works-heading">
          <h2>动态 <span>{{ total }}</span></h2>
          <button class="refresh-button" :disabled="loading" @click="refresh"><el-icon :class="{ 'is-loading': loading }"><Refresh /></el-icon> 刷新</button>
        </div>
        <div v-if="loading && posts.length === 0" class="page-state"><el-icon class="is-loading"><Loading /></el-icon><p>正在加载动态…</p></div>
        <div v-else-if="error && posts.length === 0" class="page-state"><p>{{ error }}</p><button class="secondary-button" @click="refresh">重新加载</button></div>
        <div v-else-if="posts.length === 0" class="page-state"><el-icon class="empty-icon"><Picture /></el-icon><h3>暂无动态</h3><p>{{ isOwn ? '把值得记住的瞬间，分享在这里' : 'TA 还没有发布动态' }}</p><button v-if="isOwn" class="primary-button" @click="publishPost">发布第一条动态</button></div>
        <div v-else class="works-grid">
          <article v-for="post in posts" :key="post.id" class="work-card">
            <button class="work-cover" @click="openMomentDetail(post.id)" :aria-label="post.preview.text || '查看图片动态'">
              <img v-if="post.preview.image" :src="post.preview.image" alt="动态封面" loading="lazy" @error="post.preview.image = ''" />
              <span v-else class="text-cover"><span class="text-mark">“</span>{{ post.preview.text || '分享了一条动态' }}</span>
              <span class="work-stats"><span>♡ {{ post.likeCount || 0 }}</span><span>评论 {{ post.commentCount || 0 }}</span></span>
            </button>
            <div class="work-info">
              <button class="work-title" @click="openMomentDetail(post.id)">{{ post.preview.text || '图片动态' }}</button>
              <div class="work-footer"><time>{{ formatMomentsTime(post.publishTime) }}</time>
                <div v-if="isOwn" class="work-actions">
                  <button @click="editPost(post)" title="编辑动态" aria-label="编辑动态"><el-icon><Edit /></el-icon></button>
                  <button class="delete-button" :disabled="!!deletingId" @click="deletePost(post)" title="删除动态" aria-label="删除动态"><el-icon :class="{ 'is-loading': deletingId === post.id }"><Loading v-if="deletingId === post.id" /><Delete v-else /></el-icon></button>
                </div>
              </div>
            </div>
          </article>
        </div>
        <div v-if="posts.length" class="load-more">
          <p v-if="error" class="error-text">{{ error }}</p>
          <button v-if="hasMore || error" class="secondary-button" :disabled="loading" @click="error ? refresh() : loadPosts(false)">{{ loading ? '正在加载…' : error ? '重试' : '加载更多' }}</button>
          <span v-else>已经看到全部动态了</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Loading, Picture, Edit, Delete } from '@element-plus/icons-vue'
import WindowControls from '@/components/WindowControls.vue'
import { listUserMomentsApi, listMyMomentsApi, deleteMomentApi } from '@/api/Moments'
import { getMyProfileApi } from '@/api/User'
import { momentPreview } from '@/utils/momentPresentation'
import { openMomentDetail } from '@/utils/momentWindows'
import { formatMomentsTime } from '@/utils/utils'
import type { MomentProfile, UserMoment, UserMomentsWindowData } from '@/types/userMoments'
import emitter from '@/utils/mitt'

type PostCard = UserMoment & { preview: ReturnType<typeof momentPreview> }
const targetId = ref('')
const viewerId = ref('')
const profile = ref<MomentProfile>({})
let ownProfile: MomentProfile = {}
const isOwn = computed(() => !!viewerId.value && viewerId.value === targetId.value)
const displayName = computed(() => profile.value.username || '用户')
const posts = ref<PostCard[]>([])
const total = ref(0)
const page = ref(0)
const pageSize = 12
const lastPageSize = ref(0)
const loading = ref(false)
const error = ref('')
const deletingId = ref('')
const hasMore = computed(() => posts.value.length < total.value && lastPageSize.value === pageSize)
let requestVersion = 0
let profileVersion = 0
let disposed = false
let removeWindowListener: (() => void) | undefined

const loadPosts = async (reset: boolean) => {
  if (!targetId.value || disposed || (loading.value && !reset)) return
  const version = ++requestVersion
  const nextPage = reset ? 1 : page.value + 1
  loading.value = true
  error.value = ''
  try {
    const result = isOwn.value
      ? await listMyMomentsApi(nextPage, pageSize)
      : await listUserMomentsApi(targetId.value, nextPage, pageSize)
    if (version !== requestVersion) return
    if (result.code !== 1 || !Array.isArray(result.data?.data)) throw new Error(result.msg || '动态加载失败')
    const list = result.data.data.map(post => ({ ...post, id: String(post.id), preview: momentPreview(post.content) }))
    const existingIds = new Set(reset ? [] : posts.value.map(post => post.id))
    posts.value = reset ? list : [...posts.value, ...list.filter(post => !existingIds.has(post.id))]
    total.value = Number(result.data.total)
    page.value = nextPage // 请求成功后才推进页码，失败重试不会漏页。
    lastPageSize.value = list.length
    const author = list[0]
    if (author) {
      profile.value = { ...profile.value, username: profile.value.username || author.username, avatar: profile.value.avatar || author.avatar }
    }
  } catch (cause) {
    if (version === requestVersion) error.value = cause instanceof Error ? cause.message : '动态加载失败，请重试'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

const loadOwnProfile = async () => {
  const version = ++profileVersion
  try {
    const result = await getMyProfileApi()
    if (disposed || version !== profileVersion || !isOwn.value) return
    if (result.code === 1 && result.data) {
      ownProfile = { username: result.data.username, avatar: result.data.avatar, account: result.data.account }
      profile.value = { ...ownProfile }
    }
  } catch (cause) {
    // 资料请求失败时仍可查看动态，保留登录时缓存的头像和用户名。
    console.warn('刷新个人资料失败', cause)
  }
}

const showUser = (data: UserMomentsWindowData = {}) => {
  if (disposed) return
  const id = String(data.userId || viewerId.value)
  if (!id) return
  if (id === targetId.value) {
    for (const key of ['username', 'avatar', 'account'] as const) {
      if (data.profile?.[key]) profile.value[key] = data.profile[key]
    }
    return
  }
  profileVersion++
  targetId.value = id
  profile.value = id === viewerId.value ? { ...ownProfile } : { ...data.profile }
  posts.value = []
  total.value = 0
  page.value = 0
  lastPageSize.value = 0
  void loadPosts(true)
  if (isOwn.value) void loadOwnProfile()
}

const refresh = () => {
  void loadPosts(true)
  if (isOwn.value) void loadOwnProfile()
}

const publishPost = () => (window as any).windowToolApi.createNewWindow('createMomentView', null)
const editPost = (post: PostCard) => {
  if (!isOwn.value) return
  ;(window as any).windowToolApi.createNewWindow('updateMomentView', {
    id: post.id, content: post.content, publishTime: post.publishTime
  })
}

const deletePost = async (post: PostCard) => {
  if (!isOwn.value || deletingId.value) return
  const authorId = targetId.value
  try {
    await ElMessageBox.confirm('删除后将不再展示这条动态，确定删除吗？', '删除动态', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    if (!isOwn.value || targetId.value !== authorId) return
    deletingId.value = post.id
    const result = await deleteMomentApi(post.id)
    if (result.code !== 1) throw new Error(result.msg || '删除失败')
    ElMessage.success('动态已删除')
    emitter.emit('moments:updated')
  } catch (cause) {
    if (cause !== 'cancel' && cause !== 'close') ElMessage.error(cause instanceof Error ? cause.message : '删除失败')
  } finally {
    deletingId.value = ''
  }
}

const handleProfileUpdated = () => { if (isOwn.value) void loadOwnProfile() }

onMounted(async () => {
  const api = (window as any).userInfoApi
  const [id, username, avatar, account] = await Promise.all(['userId', 'username', 'avatar', 'account'].map(key => api.storeGetUserInfo(key)))
  if (disposed) return
  viewerId.value = String(id || '')
  ownProfile = { username, avatar, account }
  emitter.on('moments:updated', refresh)
  emitter.on('profile:updated', handleProfileUpdated)
  const windowApi = (window as any).windowToolApi
  // 先监听再拉取缓存，覆盖窗口首次加载与已打开时切换用户这两种时序。
  let receivedPush = false
  removeWindowListener = windowApi.sendWindowInfo((_event: unknown, data: UserMomentsWindowData) => {
    receivedPush = true
    showUser(data)
  })
  const data = await windowApi.getPendingData()
  if (!receivedPush) showUser(data || {})
})

onUnmounted(() => {
  disposed = true
  requestVersion++
  profileVersion++
  removeWindowListener?.()
  emitter.off('moments:updated', refresh)
  emitter.off('profile:updated', handleProfileUpdated)
})
</script>

<style scoped>
.profile-window { height: 100vh; display: flex; flex-direction: column; overflow: hidden; color: var(--color-text-primary); background: rgba(var(--color-surface-rgb), .78); backdrop-filter: blur(26px); }
.window-header { height: 45px; flex-shrink: 0; display: flex; align-items: center; padding: 0 185px 0 24px; font-size: 12px; color: var(--color-text-muted); -webkit-app-region: drag; }
.profile-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-app-region: no-drag; }
.profile-hero { position: relative; margin: 0 24px; padding: 74px 28px 22px; border: 1px solid var(--color-border-subtle); border-radius: 18px; overflow: hidden; background: rgba(var(--color-surface-rgb), .55); }
.hero-cover { position: absolute; inset: 0 0 auto; height: 118px; background: radial-gradient(ellipse at 83% 5%, rgba(var(--color-accent-rgb), .42), transparent 60%), linear-gradient(115deg, rgba(var(--color-accent-rgb), .16), rgba(147, 123, 189, .18)); border-bottom: 1px solid var(--color-border-subtle); }
.profile-info { position: relative; display: flex; align-items: flex-end; gap: 22px; }
.profile-avatar, .avatar-placeholder { width: 112px; height: 112px; flex-shrink: 0; border: 4px solid var(--color-bg-deep); border-radius: 26px; box-sizing: border-box; object-fit: cover; box-shadow: 0 10px 24px #0002; }
.avatar-placeholder { display: grid; place-items: center; background: var(--color-accent); color: white; font-size: 40px; }
.profile-description { flex: 1; min-width: 0; padding-top: 38px; }
.profile-label { font-size: 11px; color: var(--color-text-muted); }
h1 { margin: 6px 0 7px; font-size: 28px; line-height: 1.3; overflow-wrap: anywhere; }
.profile-description p { margin: 0; font-size: 12px; color: var(--color-text-muted); overflow-wrap: anywhere; }
.profile-summary { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-muted); margin-top: 25px; }
.profile-summary strong { color: var(--color-text-primary); font-size: 20px; }
.summary-divider { height: 14px; border-right: 1px solid var(--color-border-subtle); margin: 0 7px; }
button { font: inherit; cursor: pointer; color: inherit; }
.primary-button, .secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 18px; border: 1px solid rgba(var(--color-accent-rgb), .3); border-radius: 10px; font-size: 13px; transition: background .2s, transform .2s; }
.primary-button { color: var(--color-bg-deep); background: var(--color-accent); }
.secondary-button { background: rgba(var(--color-accent-rgb), .08); color: var(--color-accent); }
.primary-button:hover, .secondary-button:hover { transform: translateY(-1px); filter: brightness(1.06); }
button:disabled { opacity: .5; cursor: default; transform: none; }
.works-section { padding: 28px 24px; }
.works-heading { display: flex; align-items: center; justify-content: space-between; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-subtle); margin-bottom: 20px; }
h2 { margin: 0; font-size: 17px; }
h2 span { margin-left: 7px; font-weight: 400; font-size: 12px; color: var(--color-text-muted); }
.refresh-button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; font-size: 12px; color: var(--color-text-muted); }
.refresh-button:hover { color: var(--color-accent); }
.works-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.work-card { min-width: 0; overflow: hidden; border: 1px solid var(--color-border-subtle); border-radius: 12px; background: rgba(var(--color-surface-rgb), .5); transition: transform .22s, box-shadow .22s; }
.work-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px #0002; }
.work-cover { display: block; position: relative; width: 100%; aspect-ratio: 4/5; padding: 0; border: 0; overflow: hidden; text-align: left; background: linear-gradient(145deg, rgba(var(--color-accent-rgb), .15), rgba(var(--color-surface-rgb), .75)); }
.work-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s; }
.work-cover:hover img { transform: scale(1.035); }
.text-cover { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; overflow: hidden; padding: 28px 22px 45px; font-size: 16px; line-height: 1.7; overflow-wrap: anywhere; }
.text-mark { display: block; font-size: 48px; line-height: .9; color: var(--color-accent); opacity: .6; }
.work-stats { position: absolute; bottom: 0; left: 0; right: 0; display: flex; gap: 14px; padding: 30px 13px 12px; color: white; font-size: 11px; background: linear-gradient(transparent, #0009); }
.work-info { padding: 12px; }
.work-title { width: 100%; border: 0; padding: 0; background: none; font-size: 13px; line-height: 1.6; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.work-footer { display: flex; justify-content: space-between; align-items: center; min-height: 24px; margin-top: 7px; }
time { font-size: 11px; color: var(--color-text-muted); }
.work-actions { display: flex; gap: 8px; }
.work-actions button { display: flex; align-items: center; border: 0; padding: 4px; border-radius: 5px; background: none; color: var(--color-text-muted); }
.work-actions button:hover { color: var(--color-accent); background: rgba(var(--color-accent-rgb), .1); }
.work-actions .delete-button:hover, .error-text { color: #e98080; }
.page-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 260px; gap: 14px; color: var(--color-text-muted); font-size: 13px; }
.page-state p, .page-state h3 { margin: 0; }
.page-state h3 { color: var(--color-text-primary); font-size: 17px; }
.empty-icon { font-size: 40px; opacity: .5; }
.load-more { padding: 30px 0 10px; text-align: center; font-size: 12px; color: var(--color-text-muted); }
.profile-scroll::-webkit-scrollbar { width: 5px; }
.profile-scroll::-webkit-scrollbar-thumb { background: rgba(var(--color-accent-rgb), .25); border-radius: 5px; }
@media (min-width: 1150px) { .works-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 750px) { .works-grid { gap: 12px; } .profile-hero { padding: 74px 20px 20px; } .profile-info { gap: 16px; } h1 { font-size: 24px; } .publish-button { padding: 9px 12px; } }
@media (prefers-reduced-motion: reduce) { .work-card, .work-cover img, button { transition: none; } }
</style>
