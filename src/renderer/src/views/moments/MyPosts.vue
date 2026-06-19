<template>
  <div class="my-posts-container">
    <!-- 头部 -->
    <div class="my-posts-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="header-title">我发布的帖子</span>
        <span class="post-count">共 {{ postList.length }} 篇</span>
      </div>
    </div>

    <!-- 内容滚动区（始终渲染，避免 observer 绑定失败） -->
    <div class="post-scroll-area">
      <el-scrollbar style="height: 100%; width: 100%">
        <!-- 首次加载中 -->
        <div v-if="initialLoading" class="loading-state">
          <el-icon class="loading-icon">
            <Loading />
          </el-icon>
          <span>加载中...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="postList.length === 0" class="empty-state">
          <el-icon class="empty-icon">
            <Edit />
          </el-icon>
          <span>你还没有发布过帖子</span>
        </div>

        <!-- 帖子网格 -->
        <template v-else>
          <div class="post-grid" ref="postGridRef">
            <div v-for="post in postList" :key="post.id" class="post-card" @click="handleEdit(post)">
              <!-- 删除按钮 -->
              <button class="delete-btn" @click.stop="handleDeleteClick(post)" title="删除">
                <el-icon>
                  <Delete />
                </el-icon>
              </button>

              <!-- 用户信息头部 -->
              <div class="post-card-header">
                <img :src="post.avatar" alt="头像" class="post-avatar" />
                <span class="post-username">{{ post.username }}</span>
              </div>

              <!-- 内容区：图片 + 文字预览 -->
              <div class="post-card-body">
                <div v-if="post._firstImage" class="post-card-image">
                  <img :src="post._firstImage" alt="" loading="lazy" />
                </div>
                <div class="post-text-preview" v-html="post.content"></div>
              </div>

              <!-- 底部时间 -->
              <div class="post-card-footer">
                <div class="post-time">{{ formatTime(post.publishTime) }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- 加载更多探测器（始终渲染，参照 Moments 模式） -->
        <div ref="loadMoreRef" class="load-more-trigger">
          <div v-if="loadingMore" class="loading-status">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>正在加载更多...</span>
          </div>
          <div v-else-if="!hasMore && postList.length > 0" class="no-more-status">
            <span>— 没有更多帖子了 —</span>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 删除确认弹窗 -->
    <el-dialog v-model="showDeleteDialog" title="确认删除" width="360px" append-to-body class="my-posts-delete-dialog">
      <div class="delete-confirm-text">确定要删除该帖子吗？删除后无法恢复。</div>
      <template #footer>
        <el-button @click="showDeleteDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Edit, Delete } from '@element-plus/icons-vue'
import { listMyMomentsApi, deleteMomentApi } from '../../api/Moments'
import dayjs from 'dayjs'

const router = useRouter()
const postList = ref<any[]>([])
const initialLoading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20
const loadMoreRef = ref<HTMLElement | null>(null)
const postGridRef = ref<HTMLElement | null>(null)
const showDeleteDialog = ref(false)
const deletingPost = ref<any>(null)

// 提取第一张图片
const getFirstImage = (content: string): string | null => {
  if (!content) return null
  const match = content.match(/<img[^>]+src="([^"]+)"/i)
  return match ? match[1] : null
}

// 格式化时间
const formatTime = (time: string): string => {
  if (!time) return ''
  const d = dayjs(time)
  const now = dayjs()
  if (now.diff(d, 'day') < 1) return d.format('HH:mm')
  if (now.diff(d, 'year') < 1) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}

const goBack = () => {
  router.back()
}

const loadPosts = async () => {
  try {
    const res = await listMyMomentsApi(page.value, pageSize)
    const data = res?.data.data
    if (data) {
      const list = (data.data || data || []).map((p: any) => ({
        ...p,
        _firstImage: getFirstImage(p.content)
      }))
      postList.value = page.value === 1 ? list : [...postList.value, ...list]
      hasMore.value = list.length >= pageSize
    }
  } catch (e) {
    console.error('加载帖子失败', e)
    ElMessage.warning('加载帖子失败')
  } finally {
    initialLoading.value = false
    loadingMore.value = false
  }
}

const handleEdit = (post: any) => {
  (window as any).windowToolApi?.createNewWindow('updateMomentView', {
    id: post.id,
    content: post.content,
    publishTime: post.publishTime
  })
}

const handleDeleteClick = (post: any) => {
  showDeleteDialog.value = true
  deletingPost.value = post
}

const confirmDelete = async () => {
  if (!deletingPost.value) return
  const postId = deletingPost.value.id
  try {
    // 发送删除帖子的请求
    await deleteMomentApi(postId)

    postList.value = postList.value.filter(p => p.id !== postId)
    ElMessage.success('删除成功')
  } catch (e) {
    console.error('删除帖子失败', e)
    ElMessage.error('删除失败')
  }
  showDeleteDialog.value = false
  deletingPost.value = null
}

let observer: IntersectionObserver | null = null

const initObserver = () => {
  if (!loadMoreRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !initialLoading.value && !loadingMore.value && hasMore.value) {
        loadingMore.value = true
        page.value += 1
        loadPosts()
      }
    },
    { rootMargin: '100px' }
  )
  observer.observe(loadMoreRef.value)
}

onMounted(() => {
  loadPosts()
  initObserver()
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<style scoped>
.my-posts-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(28, 38, 50, 0.35);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #f0f2f5;
  overflow: hidden;
}

/* ── 头部 ── */
.my-posts-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid rgba(67, 243, 255, 0.2);
  background: linear-gradient(135deg, rgba(67, 243, 255, 0.1) 0%, rgba(0, 217, 255, 0.06) 100%);
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
}

.back-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  color: rgba(240, 242, 245, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #f0f2f5;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #43f3ff;
  text-shadow: 0 0 8px rgba(67, 243, 255, 0.2);
}

.post-count {
  font-size: 12px;
  color: rgba(240, 242, 245, 0.4);
}

/* ── 加载 / 空状态 ── */
.loading-state,
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(240, 242, 245, 0.4);
  font-size: 14px;
}

.loading-icon {
  font-size: 28px;
  animation: spin 1s linear infinite;
}

.empty-icon {
  font-size: 40px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 滚动区域 ── */
.post-scroll-area {
  flex: 1;
  overflow: hidden;
}

/* ── 网格 ── */
.post-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  align-content: start;
}

.post-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(67, 243, 255, 0.12);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 8px;

  /* 虚拟列表效果：浏览器自动跳过屏幕外卡片渲染 */
  content-visibility: auto;
  contain-intrinsic-size: auto 280px;
}

.post-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(67, 243, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(67, 243, 255, 0.08);
}

/* ── 卡片头部：头像 + 用户名 ── */
.post-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.post-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid rgba(67, 243, 255, 0.25);
  flex-shrink: 0;
  object-fit: cover;
}

.post-username {
  font-size: 13px;
  font-weight: 600;
  color: #43f3ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 卡片内容：图片 + 文字 ── */
.post-card-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-card-image {
  width: 100%;
  max-height: 140px;
  overflow: hidden;
  border-radius: 8px;
  flex-shrink: 0;
}

.post-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(67, 243, 255, 0.15);
}

.post-text-preview {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(240, 242, 245, 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  max-height: 58px;
}

/* 富文本内容中的图片在预览区隐藏（已由 post-card-image 展示） */
.post-text-preview :deep(img) {
  display: none;
}

.post-text-preview :deep(h1),
.post-text-preview :deep(h2),
.post-text-preview :deep(h3) {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 242, 245, 0.7);
  margin: 2px 0;
}

.post-text-preview :deep(p) {
  margin: 0;
}

/* ── 卡片底部 ── */
.post-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 11px;
  flex-shrink: 0;
}

.post-time {
  color: rgba(240, 242, 245, 0.3);
}

/* ── 删除按钮 ── */
.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  color: #ff5a5f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  z-index: 2;
  font-size: 14px;
}

.post-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(255, 90, 95, 0.2);
  transform: scale(1.1);
}

/* ── 加载更多触发器（参照 Moments） ── */
.load-more-trigger {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
  color: rgba(67, 243, 255, 0.6);
  font-size: 14px;
  min-height: 20px;
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

.delete-confirm-text {
  color: #f0f2f5;
  font-size: 14px;
  line-height: 1.6;
}

/* ── el-scrollbar 滚动条样式 ── */
:deep(.el-scrollbar__thumb) {
  background: rgba(67, 243, 255, 0.4);
  border-radius: 4px;
}
</style>

<style>
/* ── el-dialog 删除确认弹窗（非 scoped：el-dialog append-to-body 后脱离组件 DOM） ── */
/* 覆盖 class 在 .el-dialog 上 或 .el-overlay 上两种情况 */
.el-dialog.my-posts-delete-dialog,
.el-overlay.my-posts-delete-dialog .el-dialog {
  background: rgba(28, 38, 50, 0.95) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(67, 243, 255, 0.25);
  border-radius: 12px;
}

.my-posts-delete-dialog .el-dialog__header {
  border-bottom: 1px solid rgba(67, 243, 255, 0.1);
}

.my-posts-delete-dialog .el-dialog__title {
  color: #43f3ff;
  font-weight: 600;
}

.my-posts-delete-dialog .el-dialog__body {
  color: #f0f2f5;
  padding: 20px 24px;
}

.my-posts-delete-dialog .el-dialog__footer {
  border-top: 1px solid rgba(67, 243, 255, 0.1);
}

.my-posts-delete-dialog .el-button {
  border-radius: 6px;
}

.my-posts-delete-dialog .el-button--default {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.6) !important;
}

.my-posts-delete-dialog .el-button--default:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
}

.my-posts-delete-dialog .el-button--danger {
  background: rgba(255, 90, 95, 0.2) !important;
  border: 1px solid rgba(255, 90, 95, 0.35) !important;
  color: #ff5a5f !important;
}

.my-posts-delete-dialog .el-button--danger:hover {
  background: rgba(255, 90, 95, 0.3) !important;
  border-color: rgba(255, 90, 95, 0.5) !important;
}
</style>
