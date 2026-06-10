<template>
  <div class="moments-count">
    <!-- 头部标题栏 -->
    <div class="moments-header">
      <div class="header-title">世界频道</div>
    </div>

    <div class="moments-toolbar">
      <!-- 左侧占位 -->
      <div class="toolbar-left"></div>

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
        <div class="post-list" ref="postListRef">
          <div v-if="postList.length === 0" class="empty-state">
            <p>还没有动态，快来发布第一条吧！</p>
          </div>

          <!-- 单条动态 -->
          <div class="post-item" v-for="post in postList" :key="post.id" :data-post-id="post.id">
            <!-- 用户信息头部 -->
            <div class="post-header">
              <div class="user-info" @click="openInfo(post.id)">
                <img :src="post.avatar" alt="头像" class="user-avatar" loading="lazy" />
                <div class="user-details" @click="openInfo(post.id)">
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
                <span>打赏</span>
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
          <div v-else-if="noMore" class="no-more-status">
            <span>— 没有更多动态了 —</span>
          </div>
          <div v-else class="ready-status">
            <!-- 初始状态显示一个透明的占位，确保探测器有高度 -->
          </div>
        </div>
      </el-scrollbar>
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
import { listByNewApi, likedApi, listByHot } from '../../api/Moments'
import { MomentsItem } from '../../types/moments'
import type { ScrollbarDirection } from 'element-plus'
import Masonry from 'masonry-layout'
import emitter from '../../utils/mitt';
import { formatMomentsTime } from '../../utils/utils'
import { useMomentsImageLazy } from '../../composables/useMomentsImageLazy'

const searchKeyword = ref('')
const activeTag = ref('all')
const label = ref('0')
const pageDTO = ref({
  page: 1,
  pageSize: 20
})
const postList = ref<MomentsItem[]>([])
const hotTags = ref([])

// 监听帖子列表变化，自动刷新布局，主要是因为Masonry不是响应式布局，每次新增都需要重新排列
watch(postList, async () => {
  await nextTick()
  if (masonry) {
    masonry.reloadItems?.()
    observeImages()
    masonry.layout?.()
  }
  imageLazy.observeAll()
}, { deep: true })

const loadMoreRef = ref()
let observer: IntersectionObserver | null = null
// 添加加载状态
const loading = ref(false)
// 添加是否加载完毕状态
const noMore = ref(false)
// 帖子列表容器引用
const postListRef = ref<HTMLElement | null>(null)
// Masonry 实例
let masonry: any = null
// 帖子数量上限（防止无限增长导致内存溢出）
const MAX_POSTS = 150

// 图片懒加载 + DOM 裁剪 composable
const imageLazy = useMomentsImageLazy(postListRef, {
  preloadMargin: 800,
  pruneThreshold: 3,
  maxRenderedPosts: 80
})

/**
 * 处理帖子列表数据：内容预处理 + 数量上限裁剪
 */
function processIncomingPosts(moments: any[]): any[] {
  return moments.map((n: any) => ({
    ...n,
    content: imageLazy.processContent(n.content || '')
  }))
}

/**
 * 限制帖子总数，超出上限时移除最旧的
 */
function trimPostList() {
  while (postList.value.length > MAX_POSTS) {
    postList.value.shift()
  }
}

// 滚动底部监听
async function loadMore(direction: ScrollbarDirection | string) {
  if (direction === 'bottom') {
    if (loading.value || noMore.value) return

    loading.value = true

    try {
      // 查询下一页，累加到帖子集合里
      const sortWay = label.value
      let moments
      if (sortWay == '0') {
        // 最热
        pageDTO.value.page += 1
        const page = pageDTO.value.page
        const pageSize = pageDTO.value.pageSize
        const res = await listByHot(page, pageSize)
        moments = res.data.data
      } else {
        // 查询最后一条帖子的id
        const lastId = postList.value[postList.value.length - 1].id
        const res = await listByNewApi(lastId)
        moments = res.data
      }

      moments = processIncomingPosts(moments)
      moments.forEach((n: any) => {
        postList.value.push(n)
      })
      trimPostList()
      // 新数据加载完成后，触发 Masonry 重新布局
      await nextTick()
      if (masonry) {
        masonry.reloadItems?.() // 重新扫描子元素
        observeImages() // 监听新加载的图片
        masonry.layout?.() // 重新布局
      }
    } catch (error) {
      console.error('加载失败', error)
    } finally {
      loading.value = false
    }
  }
}

async function changeSortWay() {
  postList.value = []
  const sortWay = label.value
  let moments
  // 首页加载
  if (sortWay == '0') {
    // 最热
    const pageSize = pageDTO.value.pageSize
    const res = await listByHot(1, pageSize)
    moments = res.data.data
  } else {
    // 最新
    const res = await listByNewApi(0)
    moments = res.data
  }

  moments = processIncomingPosts(moments)
  moments.forEach((n: any) => {
    postList.value.push(n)
  })

  // 排序切换后重新布局
  await nextTick()
  if (masonry) {
    masonry.reloadItems?.()
    observeImages() // 重新监听新数据的图片
    masonry.layout?.()
  }
}

// 搜索事件
const handleSearch = () => {
  // TODO: 实现搜索逻辑
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

const handleLike = (postId: number) => {
  const post = postList.value.find((p) => p.id === postId)
  if (post) {
    post.liked = !post.liked
    post.likeCount += post.liked ? 1 : -1
  }
  // 发送点赞请求
  likedApi(postId)
}

const handleFollow = (postId: number) => {
  const post = postList.value.find((p) => p.id === postId)
  if (post) {
    post.isFollowed = true
  }
}

const handleReward = (postId: number) => {
  // TODO: 实现打赏功能
}

// 初始化帖子
const listMoments = async () => {
  // 首页加载
  const pageSize = pageDTO.value.pageSize
  const res = await listByHot(1, pageSize)
  let moments = res.data.data
  moments = processIncomingPosts(moments)
  moments.forEach((n: any) => {
    postList.value.push(n)
  })
}

// 初始化底部监测器
const initObserver = () => {
  // 创建观察器
  observer = new IntersectionObserver(
    (entries) => {
      // entries[0].isIntersecting 为 true 表示探测器进入了视野
      if (entries[0].isIntersecting && !loading.value && !noMore.value) {
        loadMore('bottom')
      }
    },
    {
      // rootMargin 可以提前触发。比如 '100px' 表示距离底部还有 100px 就开始预加载
      rootMargin: '10px'
    }
  )

  // 开始观察探测器元素
  if (loadMoreRef.value) {
    observer.observe(loadMoreRef.value)
  }
}

// 初始化 Masonry
const initMasonry = () => {
  if (!postListRef.value) return

  // 如果已经存在实例，先销毁
  if (masonry) {
    masonry.destroy?.()
  }

  masonry = new Masonry(postListRef.value, {
    // 必需配置
    itemSelector: '.post-item',
    columnWidth: '.post-item',

    // 可选配置
    gutter: 15, // 列间距
    fitWidth: true, // 容器自适应宽度
    originLeft: true, // 从左到右排列（设为 false 从右到左）
    originTop: true, // 从上到下排列
    percentPosition: false, // 使用像素定位（true 为百分比）
    horizontalOrder: true, // 保持水平顺序

    // 动画配置
    transitionDuration: '0',
    stagger: 0, // 交错动画延迟（ms）

    // 性能优化
    resize: true, // 窗口resize时自动重排
    initLayout: true // 初始化时自动布局
  })
}

// 监听图片加载并刷新 Masonry
let layoutTimer: any = null
const debouncedLayout = () => {
  if (layoutTimer) clearTimeout(layoutTimer)
  layoutTimer = setTimeout(() => {
    if (masonry) {
      // 在重排前重置容器宽度，让 Masonry 重新计算可用空间
      if (postListRef.value) {
        postListRef.value.style.width = ''
      }
      masonry.reloadItems?.()
      masonry.layout?.()
    }
  }, 100)
}

const observeImages = () => {
  if (!postListRef.value) return

  const images = postListRef.value.querySelectorAll('img')
  images.forEach((img) => {
    if (img.getAttribute('data-observed')) return
    img.setAttribute('data-observed', 'true')

    if (img.complete) {
      debouncedLayout()
    } else {
      img.addEventListener('load', debouncedLayout)
      img.addEventListener('error', debouncedLayout)
    }
  })
}

// 监听新帖子发布事件：重新获取数据并重新布局
const handleNewPostPublished = async () => {
  // 重置列表和状态
  postList.value = []
  noMore.value = false

  // 重新获取最新数据
  await listMoments()

  // 等待 DOM 更新后重新布局
  await nextTick()

  if (masonry) {
    masonry.reloadItems?.()
    observeImages()
    masonry.layout?.()
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await listMoments()

  // DOM 更新后初始化 Masonry
  await nextTick()
  initMasonry()
  // 监听图片加载
  observeImages()
  if (masonry) {
    masonry.layout?.()
  }

  // 初始化图片懒加载 observer
  imageLazy.initObserver()
  imageLazy.observeAll()

  // 当懒加载恢复内容或激活图片后，触发 masonry 重排
  if (postListRef.value) {
    postListRef.value.addEventListener('images-activated', debouncedLayout)
    postListRef.value.addEventListener('content-restored', () => {
      if (masonry) {
        masonry.reloadItems?.()
        masonry.layout?.()
      }
    })
  }

  initObserver()

  // 监听父级容器（.moments-content）的尺寸变化，实现全自动布局
  // parentElement.parentElement 指向 el-scrollbar 的外层 div
  const parentEl = postListRef.value?.parentElement?.parentElement
  if (parentEl) {
    resizeObserver = new ResizeObserver(() => {
      debouncedLayout()
    })
    resizeObserver.observe(parentEl)
  }

  emitter.on('moments:updated', handleNewPostPublished)
})

// 销毁实例
onUnmounted(() => {
  if (observer) observer.disconnect()
  if (resizeObserver) resizeObserver.disconnect()
  imageLazy.destroy()
  if (masonry) {
    masonry.destroy?.()
  }
  if (layoutTimer) clearTimeout(layoutTimer)
  emitter.off('moments:updated', handleNewPostPublished)
})
</script>

<style scoped>
.moments-header {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: linear-gradient(135deg, rgba(67, 243, 255, 0.15) 0%, rgba(0, 217, 255, 0.1) 100%);
  border-bottom: 1px solid rgba(67, 243, 255, 0.3);
  -webkit-app-region: drag;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #43f3ff;
  text-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
}

.moments-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.toolbar-left,
.toolbar-right {
  flex: 1;
  display: flex;
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
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-right: none !important;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  border-radius: 8px 0 0 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.search-box .el-input__wrapper:hover) {
  border-color: rgba(67, 243, 255, 0.5) !important;
  background: rgba(255, 255, 255, 0.15) !important;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-input__wrapper.is-focus) {
  border-color: #43f3ff !important;
  background: rgba(255, 255, 255, 0.2) !important;
  box-shadow:
    0 0 15px rgba(67, 243, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-input__inner) {
  color: #f0f2f5;
  font-size: 14px;
}

:deep(.search-box .el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}

:deep(.search-box .el-input__prefix) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.search-box .el-input-group__append) {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none !important;
}

:deep(.search-box .el-button) {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-left: none;
  border-radius: 0 8px 8px 0;
  color: #f0f2f5 !important;
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
  background: rgba(255, 255, 255, 0.15) !important;
  color: #fff;
  border-color: rgba(67, 243, 255, 0.5) !important;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-button:active) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

/* 选择器样式优化 */
:deep(.toolbar-right .el-select) {
  --el-select-border-color-hover: rgba(67, 243, 255, 0.5);
  --el-select-input-focus-border-color: #43f3ff;
}

:deep(.toolbar-right .el-select .el-select__wrapper) {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 8px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.toolbar-right .el-select .el-select__wrapper:hover) {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(67, 243, 255, 0.5) !important;
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.toolbar-right .el-select .el-select__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: #43f3ff !important;
  box-shadow:
    0 0 15px rgba(67, 243, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.toolbar-right .el-select .el-select__placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.toolbar-right .el-select .el-select__selected-item) {
  color: #f0f2f5 !important;
}

:deep(.toolbar-right .el-select .el-select__caret) {
  color: rgba(255, 255, 255, 0.6) !important;
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
  background: rgba(28, 38, 50, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  color: rgba(67, 243, 255, 0.6);
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
  opacity: 0.5;
  letter-spacing: 1px;
}

.post-list {
  padding: 15px;
  box-sizing: border-box;
  position: relative;
  margin: 0 auto;
  /* 强制容器跟随父级缩小，触发 Masonry 响应 */
  max-width: 100% !important;
}

.post-item {
  width: 295px;
  margin-bottom: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(67, 243, 255, 0.15);
  backdrop-filter: blur(10px);
  transition: opacity 0.4s, background 0.4s, border-color 0.4s, box-shadow 0.4s, filter 0.4s;
  animation: cardEnter 0.4s ease-out forwards;
  opacity: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: block;

  /* 浏览器跳过屏幕外卡片的渲染，但保留布局占位 —— 与 Masonry 完全兼容 */
  content-visibility: auto;
  contain-intrinsic-size: auto 400px;
}

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
  color: rgba(67, 243, 255, 0.5);
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
  background: rgba(67, 243, 255, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 4px 16px rgba(67, 243, 255, 0.4),
    0 0 0 1px rgba(67, 243, 255, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: #000;
  z-index: 1000;
}

.fab-button:hover {
  background: rgba(67, 243, 255, 0.95);
  transform: scale(1.1) translateY(-2px);
  box-shadow:
    0 8px 24px rgba(67, 243, 255, 0.6),
    0 0 0 2px rgba(67, 243, 255, 0.5);
}

.fab-button:active {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(67, 243, 255, 0.5);
}

.post-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(67, 243, 255, 0.4);
  box-shadow:
    0 8px 25px rgba(67, 243, 255, 0.15),
    inset 0 0 10px rgba(67, 243, 255, 0.05);
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
  border: 1.5px solid rgba(67, 243, 255, 0.2);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: rgba(67, 243, 255, 0.6);
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
  color: #43f3ff;
}

.post-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
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
  background: rgba(67, 243, 255, 0.1);
  color: #43f3ff;
  border: 1px solid rgba(67, 243, 255, 0.3);
}

.follow-btn:hover {
  background: rgba(67, 243, 255, 0.2);
  border-color: rgba(67, 243, 255, 0.5);
  transform: scale(1.05);
}

.followed-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #f0f2f5;
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin: 8px auto;
  border: 2px solid rgba(67, 243, 255, 0.2);
  box-shadow: 0 2px 8px rgba(67, 243, 255, 0.15);
  transition: all 0.3s ease;
  display: block;
}

:deep(.post-text-wrapper img:hover) {
  border-color: rgba(67, 243, 255, 0.4);
  box-shadow: 0 4px 12px rgba(67, 243, 255, 0.3);
  transform: scale(1.02);
}

:deep(.post-text-wrapper h1) {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 10px 0 6px;
  border-bottom: 1px solid rgba(67, 243, 255, 0.2);
  padding-bottom: 4px;
}

:deep(.post-text-wrapper h2) {
  font-size: 16px;
  font-weight: 600;
  color: #e0faff;
  margin: 8px 0 5px;
  display: flex;
  align-items: center;
}

:deep(.post-text-wrapper h2::before) {
  content: '';
  width: 3px;
  height: 14px;
  background: #43f3ff;
  margin-right: 8px;
  border-radius: 2px;
}

:deep(.post-text-wrapper h3) {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 6px 0 4px;
}

:deep(.post-text-wrapper strong) {
  color: #43f3ff;
  font-weight: 600;
}

:deep(.post-text-wrapper blockquote) {
  border-left: 3px solid rgba(67, 243, 255, 0.4);
  background: rgba(67, 243, 255, 0.03);
  padding: 8px 12px;
  margin: 10px 0;
  border-radius: 0 4px 4px 0;
  color: rgba(255, 255, 255, 0.7);
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
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.action-item:hover {
  color: #43f3ff;
  background: rgba(67, 243, 255, 0.05);
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
  background: rgba(67, 243, 255, 0.4);
  border-radius: 4px;
}

.action-item:active {
  transform: scale(0.95);
}

.follow-btn:active {
  transform: scale(0.95);
}
</style>

<style>
/* 全局样式覆盖 el-select 下拉框 popper，因为 popper 默认挂载在 body 上 */
.moments-select-popper.el-popper {
  background: rgba(28, 38, 50, 0.8) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(67, 243, 255, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
}

.moments-select-popper .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.8) !important;
  background-color: transparent !important;
  transition: all 0.2s ease !important;
}

.moments-select-popper .el-select-dropdown__item.hover,
.moments-select-popper .el-select-dropdown__item:hover {
  background: rgba(67, 243, 255, 0.25) !important;
  color: #43f3ff !important;
}

.moments-select-popper .el-select-dropdown__item.selected {
  color: #43f3ff !important;
  font-weight: 600 !important;
  background: rgba(67, 243, 255, 0.15) !important;
}

.moments-select-popper .el-select-dropdown__item.selected.hover,
.moments-select-popper .el-select-dropdown__item.selected:hover {
  background: rgba(67, 243, 255, 0.3) !important;
}

.moments-select-popper .el-popper__arrow::before {
  background: rgba(28, 38, 50, 0.8) !important;
  border: 1px solid rgba(67, 243, 255, 0.3) !important;
}
</style>