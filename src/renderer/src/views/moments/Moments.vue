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
      <el-scrollbar ref="scrollbarRef" @scroll="handleScroll" style="height: 100%; width: 100%">
        <div class="post-list" :class="{ 'is-reflowing': isReflowing }">
          <div v-if="postList.length === 0" class="empty-state">
            <p>还没有动态，快来发布第一条吧！</p>
          </div>

          <!-- 单条动态 -->
          <div class="post-item" v-for="post in postList" :key="post.id">
            <!-- 用户信息头部 -->
            <div class="post-header">
              <div class="user-info">
                <img :src="post.avatar" alt="头像" class="user-avatar" />
                <div class="user-details">
                  <div class="username">{{ post.username }}</div>
                  <div class="post-time">{{ post.publishTime }}</div>
                </div>
              </div>
              <div class="follow-btn" v-if="!post.isFollowed" @click="handleFollow(post.id)">
                <el-icon>
                  <Plus />
                </el-icon> 关注
              </div>
              <div class="followed-btn" v-else>
                <el-icon>
                  <Check />
                </el-icon> 已关注
              </div>
            </div>

            <!-- 动态内容 -->
            <div class="post-content">
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
              <div class="action-item" :class="{ active: post.showComments }" @click="handleComment(post.id)">
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

            <Transition name="comment-slide">
              <!-- 评论列表 -->
              <div class="comment-list" v-if="post.showComments && post.comments && post.comments.length > 0">
                <div class="comment-item" v-for="comment in post.comments" :key="comment.id">
                  <img :src="comment.avatar" class="comment-avatar" />
                  <div class="comment-content">
                    <div class="comment-user">{{ comment.username }}</div>
                    <div class="comment-text">{{ comment.content }}</div>
                    <div class="comment-footer">
                      <span class="comment-time">{{ comment.time }}</span>
                      <div class="comment-actions">
                        <div class="comment-action" :class="{ active: comment.liked }"
                          @click="handleCommentLike(post.id, comment.id)">
                          <el-icon>
                            <i class="iconfont icon-xihuan" :class="{ 'is-liked': comment.liked }" />
                          </el-icon>
                          <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
                        </div>
                        <div class="comment-action" @click="handleCommentReply(post.id, comment.id, comment.username)">
                          <el-icon>
                            <ChatLineRound />
                          </el-icon>
                          <span>回复</span>
                        </div>
                      </div>
                    </div>

                    <!-- 回复列表 -->
                    <div class="reply-list" v-if="comment.replies && comment.replies.length > 0">
                      <div class="reply-item" v-for="reply in comment.replies" :key="reply.id">
                        <span class="reply-user">{{ reply.username }}</span>
                        <span class="reply-to" v-if="reply.replyTo"> 回复 {{ reply.replyTo }}</span>
                        <span class="reply-text">: {{ reply.content }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
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
import { ChatLineRound, Check, Coin, Plus, Search } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import { listApi, likeedApi } from '../../api/Moments'
import { MomentsItem } from '../../types/moments'
import type { ScrollbarDirection } from 'element-plus'

const scrollbarRef = ref()
const searchKeyword = ref('')
const activeTag = ref('all')
const isReflowing = ref(false)
const label = ref('0')

const postList = ref<MomentsItem[]>([])
const hotTags = ref([])

// 添加加载状态
const loading = ref(false)
// 添加是否加载完毕状态
const noMore = ref(false)

// 模拟热门标签数据
// const hotTags = ref([
//   { id: 'all', name: '全部' },
//   { id: 'tech', name: '技术分享' },
//   { id: 'life', name: '日常生活' },
//   { id: 'photo', name: '摄影' },
//   { id: 'game', name: '游戏' },
//   { id: 'food', name: '美食' },
//   { id: 'travel', name: '旅行' },
//   { id: 'study', name: '学习打卡' },
//   { id: 'code', name: '代码' },
//   { id: 'electron', name: 'Electron' },
//   { id: 'vue3', name: 'Vue3' },
//   { id: 'ai', name: 'AI' },
// ])

// 滚动底部监听
async function handleScroll({ scrollTop }: { scrollTop: number }) {
  if (loading.value || noMore.value) return

  const scrollbar = scrollbarRef.value
  if (!scrollbar) return

  // 获取内部滚动的容器
  const wrapRef = scrollbar.wrapRef
  if (!wrapRef) return

  const { scrollHeight, clientHeight } = wrapRef

  if (scrollTop + clientHeight >= scrollHeight - 1) {
    loadMore('bottom')
  }
}

// 滚动底部监听
async function loadMore(direction: ScrollbarDirection | string) {
  if (direction === 'bottom') {
    if (loading.value || noMore.value) return

    loading.value = true
    console.log("正在查询下一页...")

    try {
      // 查询最后一条帖子的id
      const lastId = postList.value[postList.value.length - 1].id
      // 查询下一页，累加到帖子集合里
      console.log(lastId)

    } catch (error) {
      console.error("加载失败", error)
    } finally {
      loading.value = false
    }
  }
}

async function changeSortWay() {
  postList.value = []
  const sortWay = label.value
  // 首页加载
  const res = await listApi(sortWay, 0)
  const moments = res.data
  moments.forEach((n: any) => {
    postList.value.push(n)
  })
  console.log(postList.value)
}

// 搜索事件
const handleSearch = () => {
  console.log('搜索关键词:', searchKeyword.value)
  // TODO: 实现搜索逻辑
}

// 标签点击事件
const handleTagClick = (tagId: string) => {
  activeTag.value = tagId
  console.log('选中标签:', tagId)
  // TODO: 实现标签筛选逻辑
}

const openPublishWindow = () => {
  console.log('打开发布动态窗口');
  (window as any).windowToolApi.createNewWindow("createMomentView", null)
}

const handleLike = (postId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.liked = !post.liked
    post.likeCount += post.liked ? 1 : -1
  }
  // 发送点赞请求
  likeedApi(postId)
}

const handleComment = (postId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.showComments = !post.showComments
  }
}

const handleFollow = (postId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.isFollowed = true
  }
}

const handleReward = (postId: number) => {
  // TODO: 实现打赏功能
  console.log('打赏帖子:', postId)
}

const handleCommentLike = (postId: number, commentId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post && post.comments) {
    const comment = post.comments.find(c => c.id === commentId)
    if (comment) {
      comment.liked = !comment.liked
      comment.likeCount += comment.liked ? 1 : -1
    }
  }
}

const handleCommentReply = (postId: number, commentId: number, username: string) => {
  // TODO: 实现回复功能
  console.log('回复评论:', postId, commentId, '回复用户:', username)
}

onMounted(async () => {
  const sortWay = label.value
  // 首页加载
  const res = await listApi(sortWay, 0)
  const moments = res.data
  moments.forEach((n: any) => {
    postList.value.push(n)
  })
  console.log(postList.value)
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  border-radius: 8px 0 0 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.search-box .el-input__wrapper:hover) {
  border-color: rgba(67, 243, 255, 0.5) !important;
  background: rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.search-box .el-input__wrapper.is-focus) {
  border-color: #43f3ff !important;
  background: rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 0 15px rgba(67, 243, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

:deep(.search-box .el-button:hover) {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #fff;
  border-color: rgba(67, 243, 255, 0.5) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.toolbar-right .el-select .el-select__wrapper:hover) {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(67, 243, 255, 0.5) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

:deep(.toolbar-right .el-select .el-select__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: #43f3ff !important;
  box-shadow: 0 0 15px rgba(67, 243, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
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

.post-list {
  column-width: 280px;
  column-gap: 15px;
  padding: 15px;
  width: 100%;
  box-sizing: border-box;
}

/* 强制在窗口较小时也要有 3 列 */
@media (max-width: 800px) {
  .post-list {
    column-count: 3;
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
  box-shadow: 0 4px 16px rgba(67, 243, 255, 0.4), 0 0 0 1px rgba(67, 243, 255, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: #000;
  z-index: 1000;
}

.fab-button:hover {
  background: rgba(67, 243, 255, 0.95);
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 8px 24px rgba(67, 243, 255, 0.6), 0 0 0 2px rgba(67, 243, 255, 0.5);
}

.fab-button:active {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(67, 243, 255, 0.5);
}

.post-item {
  /* 瀑布流卡片 “防撕裂”、“防断裂”、“保完整” */
  break-inside: avoid-column;
  width: 100%;
  margin-bottom: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(67, 243, 255, 0.15);
  backdrop-filter: blur(10px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cardEnter 0.5s ease forwards;
  opacity: 0;
  transform: translateY(20px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

@keyframes cardEnter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.post-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(67, 243, 255, 0.4);
  box-shadow: 0 8px 25px rgba(67, 243, 255, 0.15), inset 0 0 10px rgba(67, 243, 255, 0.05);
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
}

/* 富文本排版样式 */
.post-text-wrapper {
  font-size: 14px;
  line-height: 1.6;
  color: #f0f2f5;
  margin-bottom: 12px;
  word-break: break-word;
}

:deep(.post-text-wrapper img) {
  max-width: 30%;
  border-radius: 8px;
  margin: 8px auto;
  border: 2px solid rgba(67, 243, 255, 0.2);
  box-shadow: 0 2px 8px rgba(67, 243, 255, 0.15);
  transition: all 0.3s ease;
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

.comment-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(67, 243, 255, 0.15);
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(67, 243, 255, 0.05);
  transition: all 0.3s ease;
}

.comment-item:hover {
  background: rgba(67, 243, 255, 0.08);
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(67, 243, 255, 0.2);
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-user {
  font-size: 13px;
  font-weight: 500;
  color: #43f3ff;
  margin-bottom: 4px;
}

.comment-text {
  font-size: 13px;
  color: #f0f2f5;
  line-height: 1.5;
  margin-bottom: 4px;
}

.comment-time {
  font-size: 11px;
  color: rgba(67, 243, 255, 0.6);
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.comment-actions {
  display: flex;
  gap: 12px;
}

.comment-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: rgba(67, 243, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(67, 243, 255, 0.08);
}

.comment-action:hover {
  background: rgba(67, 243, 255, 0.15);
  color: #43f3ff;
}

.comment-action.active {
  color: #ff4757;
  background: rgba(255, 71, 87, 0.12);
}

.comment-action.active:hover {
  background: rgba(255, 71, 87, 0.2);
}

.comment-action .el-icon {
  font-size: 13px;
}

/* 评论展开/收起动画 */
.comment-slide-enter-active,
.comment-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
}

.comment-slide-enter-from,
.comment-slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
}

.comment-slide-enter-to,
.comment-slide-leave-from {
  max-height: 1000px;
  opacity: 1;
}

.reply-list {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid rgba(67, 243, 255, 0.2);
}

.reply-item {
  padding: 6px 0;
  font-size: 12px;
  line-height: 1.5;
  color: #e0e0e0;
}

.reply-user {
  color: #43f3ff;
  font-weight: 500;
}

.reply-to {
  color: rgba(67, 243, 255, 0.7);
  margin: 0 4px;
}

.reply-text {
  color: #f0f2f5;
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
