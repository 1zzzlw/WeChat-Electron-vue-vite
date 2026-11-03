<template>
  <div class="moments-count">
    <!-- 头部标题栏 -->
    <div class="moments-header">
      <div class="header-title">世界频道</div>
    </div>

    <div class="moments-toolbar">
      <!-- 左侧：我的帖子 -->
      <div class="toolbar-left">
        <button class="my-posts-btn" @click="goMyPosts" title="我的帖子">我的帖子</button>
      </div>

      <!-- 搜索框 -->
      <div class="toolbar-center">
        <div class="search-box">
          <div class="search-group">
            <el-input v-model="searchKeyword" placeholder="搜索动态、用户、标签..." spellcheck="false" clearable
              @keyup.enter="handleSearch">
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
              <template #append>
                <el-button @click="handleSearch">搜索</el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>

      <!-- 选择器 -->
      <div class="toolbar-right">
        <el-select v-model="label" @change="changeSortWay" placeholder="最热" style="width: 120px"
          popper-class="moments-select-popper">
          <el-option label="最新" value="1" />
          <el-option label="最热" value="0" />
        </el-select>
      </div>
    </div>

    <!-- TODO 暂时不需要这个标签，因为比较麻烦，后期再添加 -->
    <div class="tag-bar">
      <!-- <div class="tag-item" :class="{ active: activeTag === tag.id }" v-for="tag in hotTags" :key="tag.id"
        @click="handleTagClick(tag.id)">
        # {{ tag.name }}
      </div> -->
    </div>

    <!-- 帖子列表 -->
    <div class="moments-content">
      <el-scrollbar ref="scrollbarRef" style="height: 100%; width: 100%">
        <div class="post-list" ref="postListRef" @load.capture="onImageSettled" @error.capture="onImageSettled">
          <div v-if="postList.length === 0" class="empty-state" role="status">
            <p>{{ loading ? '正在加载动态…' : loadError || '还没有动态，快来发布第一条吧！' }}</p>
            <el-button v-if="loadError" @click="changeSortWay">重新加载</el-button>
          </div>

          <!-- 单条动态 -->
          <div class="post-item" v-for="(post, index) in postList" :key="post.id" :data-post-id="post.id">
            <div class="post-card" :style="{ '--card-delay': Math.min(index % 20, 6) * 25 + 'ms' }">
            <!-- 用户信息头部 -->
            <div class="post-header">
              <div class="user-info" @click="openUserMoments(post.userId, post)">
                <img :src="post.avatar" alt="头像" class="user-avatar" loading="lazy" />
                <div class="user-details">
                  <div class="username">{{ post.username }}</div>
                  <div class="post-time">{{ formatMomentsTime(post.publishTime) }}</div>
                </div>
              </div>
              <div class="follow-btn" v-if="!post.isFollowed" @click="handleFollow(post.id)">
                <el-icon>
                  <Plus />
                </el-icon>
                关注
              </div>
              <div class="followed-btn" v-else>
                <el-icon>
                  <Check />
                </el-icon>
                已关注
              </div>
            </div>

            <!-- 动态内容 -->
            <div class="post-content" @click="openInfo(post.id)">
              <div class="post-text-wrapper" v-html="post.content"></div>
            </div>

            <!-- 互动区域 -->
            <div class="post-actions">
              <div class="action-item" :class="{ active: post.liked }" @click="handleLike(post.id)">
                <el-icon>
                  <i class="iconfont icon-xihuan" :class="{ 'is-liked': post.liked }" />
                </el-icon>
                <span>{{ post.likeCount > 0 ? post.likeCount : '点赞' }}</span>
              </div>
              <div class="action-item" :class="{ active: post.showComments }" @click="openInfo(post.id)">
                <el-icon>
                  <ChatLineRound />
                </el-icon>
                <span>{{ post.commentCount > 0 ? post.commentCount : '评论' }}</span>
              </div>
              <div class="action-item" @click="handleReward(post.id)">
                <el-icon>
                  <Coin />
                </el-icon>
                <span>{{ post.rewardAmount > 0 ? '¥' + post.rewardAmount : '打赏' }}</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        <!-- 探测器：只要它出现在屏幕里，就代表到底了 -->
        <div ref="loadMoreRef" class="load-more-trigger">
          <div v-if="loading" class="loading-status">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>正在加载更多...</span>
          </div>
          <div v-else-if="loadError" class="loading-status"><el-button @click="loadMore('bottom')">加载失败，点击重试</el-button></div>
          <div v-else-if="noMore" class="no-more-status">
            <span>— 没有更多动态了 —</span>
          </div>
          <div v-else class="ready-status">
            <!-- 初始状态显示一个透明的占位，确保探测器有高度 -->
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 打赏弹窗 -->
    <div v-if="rewardDialogVisible" class="reward-overlay" @click.self="rewardDialogVisible = false">
      <div class="reward-dialog">
        <div class="reward-title">打赏</div>
        <div class="reward-presets">
          <button
            v-for="preset in rewardPresets"
            :key="preset"
            class="preset-btn"
            :class="{ active: rewardAmount === preset }"
            @click="rewardAmount = preset"
          >¥{{ preset }}</button>
        </div>
        <div class="reward-custom">
          <el-input
            v-model="rewardCustomInput"
            placeholder="自定义金额"
            type="number"
            @input="rewardAmount = rewardCustomInput ? Number(rewardCustomInput) : null"
          >
            <template #prefix>¥</template>
          </el-input>
        </div>
        <div class="reward-actions">
          <button class="reward-cancel-btn" @click="rewardDialogVisible = false">取消</button>
          <button class="reward-confirm-btn" :disabled="rewardSubmitting" @click="submitReward">
            {{ rewardSubmitting ? '处理中...' : '确认打赏' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 右下角悬浮发布按钮 -->
    <div class="fab-button" @click="openPublishWindow">
      <el-icon :size="28">
        <Plus />
      </el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatLineRound, Check, Coin, Plus, Search, Loading } from '@element-plus/icons-vue'
import { onMounted, ref, onUnmounted, nextTick, watch } from 'vue'
import { listByNewApi, likedApi, listByHot, rewardApi } from '@/api/Moments'
import { MomentsItem } from '@/types/moments'
import type { ScrollbarDirection } from 'element-plus'
import { ElMessage } from 'element-plus'
import Masonry from 'masonry-layout'
import emitter from '@/utils/mitt';
import { formatMomentsTime } from '@/utils/utils'
import { useMomentsImageLazy } from '@/composables/useMomentsImageLazy'
import { openUserMoments } from '@/utils/momentWindows'

const searchKeyword = ref('')
const activeTag = ref('all')
const label = ref('0')
const pageDTO = ref({
  page: 0,
  pageSize: 20
})
const postList = ref<MomentsItem[]>([])
const hotTags = ref([])

// 打赏弹窗状态
const rewardDialogVisible = ref(false)
const currentRewardPostId = ref<number | null>(null)
const rewardAmount = ref<number | null>(null)
const rewardCustomInput = ref('')
const rewardSubmitting = ref(false)
const rewardPresets = [1, 5, 10, 20, 50]

const loadMoreRef = ref<HTMLElement>()
const postListRef = ref<HTMLElement | null>(null)
const scrollbarRef = ref()
const loading = ref(false)
const noMore = ref(false)
const loadError = ref('')
const MAX_POSTS = 150
let masonry: Masonry | null = null
let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let layoutFrame = 0
let itemsChanged = false
let viewportChanged = false
let disposed = false
let listVersion = 0
let scrollAnchor: { id: string; top: number } | null = null
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const imageLazy = useMomentsImageLazy(postListRef, { preloadMargin: 800 })

// 图片、数据与窗口尺寸的更新在一帧内合并；只有列表成员变化才重新扫描卡片。
function scheduleLayout() {
  if (disposed || layoutFrame) return
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0
    if (!masonry || !postListRef.value) return
    if (viewportChanged) { postListRef.value.style.width = ''; viewportChanged = false }
    const listChanged = itemsChanged
    const instant = listChanged || !!scrollAnchor
    if (listChanged) { masonry.reloadItems?.(); itemsChanged = false }
    // 新卡片直接放到目标列，入场动画由内层负责，防止从原点滑过视口误触发全部图片加载。
    if (instant) masonry.option?.({ transitionDuration: 0 })
    masonry.layout?.()
    if (scrollAnchor) {
      const card = [...postListRef.value.querySelectorAll<HTMLElement>('.post-item')].find(item => item.dataset.postId === scrollAnchor!.id)
      const viewport = postListRef.value.closest('.el-scrollbar__wrap')
      if (card && viewport) viewport.scrollTop += card.getBoundingClientRect().top - scrollAnchor.top
      scrollAnchor = null
    }
    if (listChanged) imageLazy.observeAll()
    if (instant) updateMotion()
    // 排序或短页面加载后重新检查末尾，避免哨兵始终可见时停止翻页。
    if (observer && loadMoreRef.value) { observer.unobserve(loadMoreRef.value); observer.observe(loadMoreRef.value) }
  })
}
function onImageSettled(event: Event) {
  if (event.target instanceof HTMLImageElement && !event.target.classList.contains('user-avatar')) scheduleLayout()
}
watch(() => postList.value.map(post => post.id), () => {
  itemsChanged = true
  scheduleLayout()
}, { flush: 'post' })

function processIncomingPosts(moments: MomentsItem[]) {
  return moments.map(post => ({ ...post, content: imageLazy.processContent(post.content || '') }))
}

async function fetchPosts(reset: boolean) {
  if (!reset && (loading.value || noMore.value)) return
  const version = reset ? ++listVersion : listVersion
  const nextPage = reset ? 1 : pageDTO.value.page + 1
  const sort = label.value
  loading.value = true
  loadError.value = ''
  if (reset) { scrollAnchor = null; postList.value = []; pageDTO.value.page = 0; noMore.value = false; scrollbarRef.value?.setScrollTop(0) }
  try {
    const response = sort === '0'
      ? await listByHot(nextPage, pageDTO.value.pageSize)
      : await listByNewApi(reset ? 0 : postList.value.at(-1)?.id || 0)
    if (disposed || version !== listVersion) return
    const incoming = sort === '0' ? response.data?.data : response.data
    if (!Array.isArray(incoming)) throw new Error('动态加载失败，请重试')
    const existing = new Set(postList.value.map(post => post.id))
    const additions = processIncomingPosts(incoming).filter(post => {
      if (existing.has(post.id)) return false
      existing.add(post.id)
      return true
    })
    // 页面末尾不再重复请求空结果；分页游标只在请求成功后推进。
    noMore.value = incoming.length === 0 || additions.length === 0
    pageDTO.value.page = nextPage
    const merged = [...postList.value, ...additions]
    if (merged.length > MAX_POSTS && postListRef.value) {
      const viewport = postListRef.value.closest('.el-scrollbar__wrap')?.getBoundingClientRect()
      const retained = new Set(merged.slice(-MAX_POSTS).map(post => String(post.id)))
      const anchor = [...postListRef.value.querySelectorAll<HTMLElement>('.post-item')].find(card => {
        const rect = card.getBoundingClientRect()
        return viewport && retained.has(card.dataset.postId || '') && rect.bottom > viewport.top && rect.top < viewport.bottom
      })
      if (anchor) scrollAnchor = { id: anchor.dataset.postId!, top: anchor.getBoundingClientRect().top }
    }
    postList.value = merged.slice(-MAX_POSTS)
  } catch {
    if (!disposed && version === listVersion) loadError.value = '动态加载失败，请重试'
  } finally { if (!disposed && version === listVersion) loading.value = false }
}
const loadMore = (direction: ScrollbarDirection | string) => { if (direction === 'bottom') return fetchPosts(false) }
const changeSortWay = () => fetchPosts(true)

// 搜索事件
const handleSearch = () => {
  // TODO: 实现搜索逻辑
}

const goMyPosts = () => {
  openUserMoments()
}

// 标签点击事件
const handleTagClick = (tagId: string) => {
  activeTag.value = tagId
  // TODO: 实现标签筛选逻辑
}

const openInfo = (id: number) => {
  (window as any).windowToolApi.createNewWindow('momentInfoView', id)
}

const openPublishWindow = () => {
  (window as any).windowToolApi.createNewWindow('createMomentView', null)
}

const handleLike = async (postId: number) => {
  const post = postList.value.find((p) => p.id === postId)
  if (!post) return
  // 乐观更新
  const prevLiked = post.liked
  const prevCount = post.likeCount
  post.liked = !post.liked
  post.likeCount += post.liked ? 1 : -1
  try {
    await likedApi(postId)
  } catch {
    // 请求失败，回滚
    post.liked = prevLiked
    post.likeCount = prevCount
    ElMessage.error('操作失败，请重试')
  }
}

const handleFollow = (postId: number) => {
  const post = postList.value.find((p) => p.id === postId)
  if (!post) return
  // TODO: 对接关注用户的 API
  console.warn('关注功能暂未对接后端 API，仅前端状态变更')
  post.isFollowed = true
}

const handleReward = (postId: number) => {
  currentRewardPostId.value = postId
  rewardAmount.value = null
  rewardCustomInput.value = ''
  rewardDialogVisible.value = true
}

const submitReward = async () => {
  if (!rewardAmount.value || rewardAmount.value < 0.01) {
    ElMessage.warning('请选择或输入打赏金额')
    return
  }
  if (rewardAmount.value > 200) {
    ElMessage.warning('打赏金额不能超过 ¥200')
    return
  }
  rewardSubmitting.value = true
  try {
    await rewardApi(currentRewardPostId.value, rewardAmount.value)
    ElMessage.success('打赏成功，感谢支持！')
    rewardDialogVisible.value = false
  } catch (e) {
    ElMessage.error('打赏失败，请稍后重试')
  } finally {
    rewardSubmitting.value = false
  }
}

const handleNewPostPublished = () => { void fetchPosts(true) }
const updateMotion = () => { masonry?.option?.({ transitionDuration: motion.matches ? 0 : '0.22s' }) }

onMounted(async () => {
  await nextTick()
  if (!postListRef.value) return
  masonry = new Masonry(postListRef.value, {
    itemSelector: '.post-item', columnWidth: '.post-item', gutter: 16, fitWidth: true,
    horizontalOrder: true, transitionDuration: motion.matches ? 0 : '0.22s', resize: false, initLayout: false
  })
  imageLazy.initObserver()
  const viewport = postListRef.value.closest('.el-scrollbar__wrap')
  observer = new IntersectionObserver(entries => {
    if (!loadError.value && entries.some(entry => entry.isIntersecting)) void fetchPosts(false)
  }, { root: viewport, rootMargin: '160px 0px' })
  await fetchPosts(true)
  if (disposed) return
  await nextTick()
  if (loadMoreRef.value) observer.observe(loadMoreRef.value)
  let previousWidth = viewport?.clientWidth
  resizeObserver = new ResizeObserver(() => {
    const width = viewport?.clientWidth
    if (width === previousWidth) return
    previousWidth = width
    viewportChanged = true
    scheduleLayout()
  })
  if (viewport) resizeObserver.observe(viewport)
  motion.addEventListener('change', updateMotion)
  emitter.on('moments:updated', handleNewPostPublished)
})
onUnmounted(() => {
  disposed = true
  listVersion++
  if (layoutFrame) cancelAnimationFrame(layoutFrame)
  observer?.disconnect()
  resizeObserver?.disconnect()
  imageLazy.destroy()
  masonry?.destroy?.()
  motion.removeEventListener('change', updateMotion)
  emitter.off('moments:updated', handleNewPostPublished)
})
</script>

<style scoped>
.moments-header {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--color-bg-deep);
  border-bottom: 1px solid rgba(var(--color-accent-rgb), 0.3);
  -webkit-app-region: drag;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(var(--color-accent-rgb), 0.3);
}

.moments-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(var(--color-surface-rgb), 0.4);
  border-bottom: 1px solid var(--color-border-subtle);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.toolbar-left,
.toolbar-right {
  flex: 1;
  display: flex;
}

.my-posts-btn {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.my-posts-btn:hover {
  background: rgba(var(--color-accent-rgb), 0.2);
  border-color: rgba(var(--color-accent-rgb), 0.5);
  box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.2);
  transform: translateY(-1px);
}

.toolbar-right {
  justify-content: flex-end;
}

.toolbar-center {
  flex: 2;
  display: flex;
  justify-content: center;
}

/* 搜索框样式 */
.search-box {
  width: 100%;
  max-width: 500px;
}

.search-group {
  display: flex;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-group:hover {
  transform: translateY(-1px);
}

:deep(.search-box .el-input__wrapper) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  border: 1px solid var(--color-border-subtle) !important;
  border-right: none !important;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  border-radius: var(--radius-md) 0 0 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.search-box .el-input__wrapper:hover) {
  border-color: rgba(var(--color-accent-rgb), 0.5) !important;
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-input__wrapper.is-focus) {
  border-color: var(--color-accent) !important;
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  box-shadow:
    0 0 15px rgba(var(--color-accent-rgb), 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-input__inner) {
  color: var(--color-text-primary);
  font-size: 14px;
}

:deep(.search-box .el-input__inner::placeholder) {
  color: var(--color-text-muted);
}

:deep(.search-box .el-input__prefix) {
  color: var(--color-text-muted);
}

:deep(.search-box .el-input-group__append) {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none !important;
}

:deep(.search-box .el-button) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  border: 1px solid var(--color-border-subtle) !important;
  border-left: none;
  border-radius: 0 8px 8px 0;
  color: var(--color-text-primary) !important;
  font-size: 14px;
  padding: 0 25px;
  height: 40px;
  margin: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none !important;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

:deep(.search-box .el-button:hover) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  color: var(--color-text-primary);
  border-color: rgba(var(--color-accent-rgb), 0.5) !important;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-button:active) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

/* 选择器样式优化 */
:deep(.toolbar-right .el-select) {
  --el-select-border-color-hover: rgba(var(--color-accent-rgb), 0.5);
  --el-select-input-focus-border-color: var(--color-accent);
}

:deep(.toolbar-right .el-select .el-select__wrapper) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  border: 1px solid var(--color-border-subtle) !important;
  border-radius: var(--radius-md);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.toolbar-right .el-select .el-select__wrapper:hover) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  border-color: rgba(var(--color-accent-rgb), 0.5) !important;
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.toolbar-right .el-select .el-select__wrapper.is-focus) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  border-color: var(--color-accent) !important;
  box-shadow:
    0 0 15px rgba(var(--color-accent-rgb), 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.toolbar-right .el-select .el-select__placeholder) {
  color: var(--color-text-muted) !important;
}

:deep(.toolbar-right .el-select .el-select__selected-item) {
  color: var(--color-text-primary) !important;
}

:deep(.toolbar-right .el-select .el-select__caret) {
  color: var(--color-text-muted) !important;
}

.tag-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  padding: 10px 0;
  width: 100%;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #000000;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  flex-shrink: 0;
}

.tag-item:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

.tag-item.active {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.5);
  font-weight: 600;
}

.moments-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-app-bg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  -webkit-app-region: no-drag;
  position: relative;
}

.moments-content {
  flex: 1;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.load-more-trigger {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
  color: var(--color-text-accent);
  font-size: 14px;
  min-height: 20px;
  /* 确保始终有高度 */
  width: 100%;
  clear: both;
}

.loading-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-more-status {
  color: var(--color-text-muted);
  letter-spacing: 1px;
}

.post-list {
  padding: 15px;
  box-sizing: border-box;
  position: relative;
  margin: 0 auto;
  /* 强制容器跟随父级缩小，触发 Masonry 响应 */
  max-width: 100%;
}

.post-item { width: 295px; margin-bottom: 16px; }
.post-card { padding: 20px; background: var(--color-bg-deep); border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle); box-shadow: var(--shadow-sm); animation: cardEnter .28s ease-out backwards; animation-delay: var(--card-delay, 0ms); transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
@keyframes cardEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--color-text-accent);
  gap: 16px;
}

/* 右下角悬浮按钮 */
.fab-button {
  position: fixed;
  right: 30px;
  bottom: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(var(--color-accent-rgb), 0.85);
  backdrop-filter: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 4px 16px rgba(var(--color-accent-rgb), 0.4),
    0 0 0 1px rgba(var(--color-accent-rgb), 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: var(--color-on-accent);
  z-index: 1000;
}

.fab-button:hover {
  background: rgba(var(--color-accent-rgb), 0.95);
  transform: scale(1.1) translateY(-2px);
  box-shadow:
    0 8px 24px rgba(var(--color-accent-rgb), 0.6),
    0 0 0 2px rgba(var(--color-accent-rgb), 0.5);
}

.fab-button:active {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.5);
}

.post-card:hover {
  background: rgba(var(--color-surface-rgb), 0.4);
  border-color: rgba(var(--color-accent-rgb), 0.4);
  box-shadow:
    0 8px 25px rgba(var(--color-accent-rgb), 0.15),
    inset 0 0 10px rgba(var(--color-accent-rgb), 0.05);
  transform: translateY(-4px);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1.5px solid rgba(var(--color-accent-rgb), 0.2);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: rgba(var(--color-accent-rgb), 0.6);
  transform: rotate(15deg);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

.post-time {
  font-size: 11px;
  color: var(--color-text-muted);
}

.follow-btn,
.followed-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.follow-btn {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
}

.follow-btn:hover {
  background: rgba(var(--color-accent-rgb), 0.2);
  border-color: rgba(var(--color-accent-rgb), 0.5);
  transform: scale(1.05);
}

.followed-btn {
  background: rgba(var(--color-surface-rgb), 0.4);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-subtle);
  cursor: default;
}

.post-content {
  margin-bottom: 12px;
  max-height: 400px;
  overflow: hidden;
}

/* 富文本排版样式 */
.post-text-wrapper {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin-bottom: 12px;
  word-break: break-word;
  max-height: 300px;
  overflow: hidden;
}

:deep(.post-text-wrapper img) {
  max-width: 100%;
  /* 修正宽度 */
  min-height: 100px;
  /* 预留最小高度，减少重排剧烈程度 */
  background: rgba(var(--color-surface-rgb), 0.4);
  border-radius: var(--radius-md);
  margin: 8px auto;
  border: 2px solid rgba(var(--color-accent-rgb), 0.2);
  box-shadow: 0 2px 8px rgba(var(--color-accent-rgb), 0.15);
  transition: all 0.3s ease;
  display: block;
}

:deep(.post-text-wrapper img:hover) {
  border-color: rgba(var(--color-accent-rgb), 0.4);
  box-shadow: 0 4px 12px rgba(var(--color-accent-rgb), 0.3);
  transform: scale(1.02);
}

:deep(.post-text-wrapper h1) {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 10px 0 6px;
  border-bottom: 1px solid rgba(var(--color-accent-rgb), 0.2);
  padding-bottom: 4px;
}

:deep(.post-text-wrapper h2) {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 8px 0 5px;
  display: flex;
  align-items: center;
}

:deep(.post-text-wrapper h2::before) {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-accent);
  margin-right: 8px;
  border-radius: 2px;
}

:deep(.post-text-wrapper h3) {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 6px 0 4px;
}

:deep(.post-text-wrapper strong) {
  color: var(--color-accent);
  font-weight: 600;
}

:deep(.post-text-wrapper blockquote) {
  border-left: 3px solid rgba(var(--color-accent-rgb), 0.4);
  background: rgba(var(--color-accent-rgb), 0.03);
  padding: 8px 12px;
  margin: 10px 0;
  border-radius: 0 4px 4px 0;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 13px;
}

:deep(.post-text-wrapper p) {
  margin: 6px 0;
}

.post-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 15px;
  margin-top: 10px;
  border-top: 1px solid var(--color-border-subtle);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.action-item:hover {
  color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.05);
}

.action-item.active {
  color: #ff4757;
}

.action-item.active .iconfont.icon-xihuan {
  color: #ff4757;
  filter: drop-shadow(0 0 5px rgba(255, 71, 87, 0.4));
}

.action-item.active:hover {
  background: rgba(255, 71, 87, 0.1);
}

:deep(.el-scrollbar__thumb) {
  background: rgba(var(--color-accent-rgb), 0.4);
  border-radius: 4px;
}

.action-item:active {
  transform: scale(0.95);
}

.follow-btn:active {
  transform: scale(0.95);
}

/* 打赏弹窗 */
.reward-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.reward-dialog {
  width: 320px;
  background: var(--color-bg-deep);
  border: 1px solid rgba(var(--color-accent-rgb), 0.35);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.reward-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent);
  text-align: center;
  margin-bottom: 20px;
}

.reward-presets {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
  background: rgba(var(--color-accent-rgb), 0.07);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover,
.preset-btn.active {
  background: rgba(var(--color-accent-rgb), 0.2);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.reward-custom {
  margin-bottom: 20px;
}

:deep(.reward-custom .el-input__wrapper) {
  background: rgba(var(--color-surface-rgb), 0.4) !important;
  border: 1px solid var(--color-border-subtle) !important;
  box-shadow: none !important;
}

:deep(.reward-custom .el-input__inner) {
  color: var(--color-text-primary);
}

:deep(.reward-custom .el-input__prefix) {
  color: var(--color-text-muted);
}

.reward-actions {
  display: flex;
  gap: 12px;
}

.reward-cancel-btn,
.reward-confirm-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.reward-cancel-btn {
  background: rgba(var(--color-surface-rgb), 0.4);
  color: var(--color-text-muted);
}

.reward-cancel-btn:hover {
  background: rgba(var(--color-surface-rgb), 0.4);
}

.reward-confirm-btn {
  background: rgba(var(--color-accent-rgb), 0.8);
  color: #000;
  font-weight: 600;
}

.reward-confirm-btn:hover:not(:disabled) {
  background: rgba(var(--color-accent-rgb), 1);
}

.reward-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: reduce) { .post-card { animation: none; transition: none; } }
</style>

<style>
/* 全局样式覆盖 el-select 下拉框 popper，因为 popper 默认挂载在 body 上 */
.moments-select-popper.el-popper {
  background: rgba(var(--color-surface-rgb), 0.8) !important;
  backdrop-filter: none !important;
  border: 1px solid rgba(var(--color-accent-rgb), 0.3) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
}

.moments-select-popper .el-select-dropdown__item {
  color: var(--color-text-secondary) !important;
  background-color: transparent !important;
  transition: all 0.2s ease !important;
}

.moments-select-popper .el-select-dropdown__item.hover,
.moments-select-popper .el-select-dropdown__item:hover {
  background: rgba(var(--color-accent-rgb), 0.25) !important;
  color: var(--color-accent) !important;
}

.moments-select-popper .el-select-dropdown__item.selected {
  color: var(--color-accent) !important;
  font-weight: 600 !important;
  background: rgba(var(--color-accent-rgb), 0.15) !important;
}

.moments-select-popper .el-select-dropdown__item.selected.hover,
.moments-select-popper .el-select-dropdown__item.selected:hover {
  background: rgba(var(--color-accent-rgb), 0.3) !important;
}

.moments-select-popper .el-popper__arrow::before {
  background: rgba(var(--color-surface-rgb), 0.8) !important;
  border: 1px solid rgba(var(--color-accent-rgb), 0.3) !important;
}
</style>
