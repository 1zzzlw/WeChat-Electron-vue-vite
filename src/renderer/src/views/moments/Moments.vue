<template>
  <div class="moments-count">
    <!-- 头部操作栏 -->
    <div class="moments-header">
      <div class="header-title">朋友圈</div>
      <div class="header-actions">
        <el-button class="publish-btn" @click="showPublishDialog">发布动态</el-button>
      </div>
    </div>

    <!-- 帖子列表 -->
    <div class="moments-content">
      <el-scrollbar ref="scrollbarRef" style="height: 100%; width: 100%">
        <div class="post-list">
          <!-- 单条动态 -->
          <div class="post-item" v-for="post in postList" :key="post.id">
            <!-- 用户信息头部 -->
            <div class="post-header">
              <div class="user-info">
                <img :src="post.avatar" alt="头像" class="user-avatar" />
                <div class="user-details">
                  <div class="username">{{ post.username }}</div>
                  <div class="post-time">{{ post.time }}</div>
                </div>
              </div>
              <div class="follow-btn" v-if="!post.isFollowed" @click="handleFollow(post.id)">
                <el-icon><Plus /></el-icon> 关注
              </div>
              <div class="followed-btn" v-else>
                <el-icon><Check /></el-icon> 已关注
              </div>
            </div>

            <!-- 动态内容 -->
            <div class="post-content">
              <div class="post-text">{{ post.content }}</div>
              <!-- 图片展示 -->
              <div class="post-images" v-if="post.images && post.images.length > 0">
                <img 
                  v-for="(img, index) in post.images" 
                  :key="index" 
                  :src="img" 
                  class="post-image"
                  @click="previewImage(post.images, index)"
                />
              </div>
            </div>

            <!-- 互动区域 -->
            <div class="post-actions">
              <div class="action-item" :class="{ active: post.isLiked }" @click="handleLike(post.id)">
                <el-icon><StarFilled v-if="post.isLiked" /><Star v-else /></el-icon>
                <span>{{ post.likeCount > 0 ? post.likeCount : '点赞' }}</span>
              </div>
              <div class="action-item" @click="handleComment(post.id)">
                <el-icon><ChatLineRound /></el-icon>
                <span>{{ post.commentCount > 0 ? post.commentCount : '评论' }}</span>
              </div>
              <div class="action-item" @click="handleReward(post.id)">
                <el-icon><Coin /></el-icon>
                <span>打赏</span>
              </div>
            </div>

            <!-- 评论列表 -->
            <div class="comment-list" v-if="post.comments && post.comments.length > 0">
              <div class="comment-item" v-for="comment in post.comments" :key="comment.id">
                <img :src="comment.avatar" class="comment-avatar" />
                <div class="comment-content">
                  <div class="comment-user">{{ comment.username }}</div>
                  <div class="comment-text">{{ comment.content }}</div>
                  <div class="comment-time">{{ comment.time }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 发布动态对话框 -->
    <el-dialog v-model="publishDialogVisible" title="发布动态" width="500px" :modal="true">
      <el-input
        v-model="newPostContent"
        type="textarea"
        :rows="6"
        placeholder="分享新鲜事..."
        resize="none"
      />
      <div class="dialog-actions">
        <el-button @click="selectImages">
          <el-icon><Picture /></el-icon> 添加图片
        </el-button>
      </div>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePublish">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Star, StarFilled, ChatLineRound, Coin, Plus, Check, Picture } from '@element-plus/icons-vue'

const scrollbarRef = ref()
const publishDialogVisible = ref(false)
const newPostContent = ref('')

// 模拟数据
const postList = ref([
  {
    id: 1,
    username: '张三',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    time: '2小时前',
    content: '今天天气真不错，适合出去走走！分享一些随手拍的照片～',
    images: [
      'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
      'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg'
    ],
    isLiked: false,
    likeCount: 23,
    commentCount: 5,
    isFollowed: false,
    comments: [
      {
        id: 1,
        username: '李四',
        avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
        content: '照片拍得真好看！',
        time: '1小时前'
      }
    ]
  },
  {
    id: 2,
    username: '李四',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    time: '5小时前',
    content: '学习新技术真的很有趣，今天又解决了一个难题～',
    images: [],
    isLiked: true,
    likeCount: 15,
    commentCount: 3,
    isFollowed: true,
    comments: []
  }
])

const showPublishDialog = () => {
  publishDialogVisible.value = true
}

const handlePublish = () => {
  // TODO: 实现发布逻辑
  console.log('发布内容:', newPostContent.value)
  publishDialogVisible.value = false
  newPostContent.value = ''
}

const handleLike = (postId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.isLiked = !post.isLiked
    post.likeCount += post.isLiked ? 1 : -1
  }
}

const handleComment = (postId: number) => {
  // TODO: 实现评论功能
  console.log('评论帖子:', postId)
}

const handleReward = (postId: number) => {
  // TODO: 实现打赏功能
  console.log('打赏帖子:', postId)
}

const handleFollow = (postId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.isFollowed = true
  }
}

const selectImages = () => {
  // TODO: 实现选择图片功能
  console.log('选择图片')
}

const previewImage = (images: string[], index: number) => {
  // TODO: 实现图片预览功能
  console.log('预览图片:', images, index)
}
</script>

<style scoped>
.moments-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(28, 38, 50, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  -webkit-app-region: no-drag;
}

.moments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(50, 65, 85, 0.9);
  border-bottom: 1px solid rgba(66, 153, 225, 0.3);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #f5f5f5;
}

.publish-btn {
  background: rgba(66, 153, 225, 0.3);
  border: 1px solid rgba(66, 153, 225, 0.4);
  color: #f0f0f0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.publish-btn:hover {
  background: rgba(66, 153, 225, 0.4);
  border-color: rgba(66, 153, 225, 0.5);
  transform: translateY(-1px);
}

.moments-content {
  flex: 1;
  overflow: hidden;
}

.post-list {
  padding: 10px 0;
}

.post-item {
  margin: 0 15px 15px;
  padding: 16px;
  background: rgba(40, 50, 65, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(66, 153, 225, 0.25);
  transition: all 0.2s ease;
}

.post-item:hover {
  background: rgba(45, 55, 70, 0.9);
  border-color: rgba(66, 153, 225, 0.4);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.15);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2px solid rgba(66, 153, 225, 0.3);
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-size: 15px;
  font-weight: 600;
  color: #f0f2f5;
}

.post-time {
  font-size: 12px;
  color: rgba(160, 180, 220, 0.7);
}

.follow-btn,
.followed-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.follow-btn {
  background: rgba(66, 153, 225, 0.25);
  color: #7cb7f5;
  border: 1px solid rgba(66, 153, 225, 0.4);
}

.follow-btn:hover {
  background: rgba(66, 153, 225, 0.35);
  transform: translateY(-1px);
}

.followed-btn {
  background: rgba(102, 217, 102, 0.2);
  color: rgba(102, 217, 102, 0.9);
  border: 1px solid rgba(102, 217, 102, 0.3);
  cursor: default;
}

.post-content {
  margin-bottom: 12px;
}

.post-text {
  font-size: 14px;
  line-height: 1.6;
  color: #f0f2f5;
  margin-bottom: 12px;
  word-break: break-word;
}

.post-images {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}

.post-images:has(img:only-child) {
  grid-template-columns: 1fr;
}

.post-images:has(img:nth-child(2):last-child) {
  grid-template-columns: repeat(2, 1fr);
}

.post-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid rgba(66, 153, 225, 0.2);
  transition: all 0.2s ease;
}

.post-image:hover {
  border-color: rgba(66, 153, 225, 0.4);
  transform: scale(1.02);
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid rgba(66, 153, 225, 0.15);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: rgba(160, 180, 220, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(66, 153, 225, 0.1);
}

.action-item:hover {
  background: rgba(66, 153, 225, 0.2);
  color: #7cb7f5;
  transform: translateY(-1px);
}

.action-item.active {
  color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
}

.action-item.active:hover {
  background: rgba(255, 215, 0, 0.25);
}

.comment-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(66, 153, 225, 0.15);
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(28, 38, 50, 0.5);
  transition: all 0.2s ease;
}

.comment-item:hover {
  background: rgba(35, 45, 60, 0.6);
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(66, 153, 225, 0.2);
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-user {
  font-size: 13px;
  font-weight: 500;
  color: #7cb7f5;
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
  color: rgba(160, 180, 220, 0.6);
}

:deep(.el-scrollbar__thumb) {
  background: rgba(66, 153, 225, 0.4);
  border-radius: 4px;
}

:deep(.el-dialog) {
  background: rgba(40, 50, 65, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 153, 225, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(66, 153, 225, 0.2);
  padding: 15px 20px;
}

:deep(.el-dialog__title) {
  color: #f5f5f5;
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-textarea__inner) {
  background: rgba(28, 38, 50, 0.8);
  color: #f0f0f0;
  border: 1px solid rgba(66, 153, 225, 0.2);
  border-radius: 8px;
}

:deep(.el-textarea__inner::placeholder) {
  color: rgba(240, 240, 240, 0.4);
}

.dialog-actions {
  margin-top: 15px;
}

.dialog-actions .el-button {
  background: rgba(66, 153, 225, 0.2);
  border: 1px solid rgba(66, 153, 225, 0.3);
  color: #f0f0f0;
}

.dialog-actions .el-button:hover {
  background: rgba(66, 153, 225, 0.3);
}

:deep(.el-button--primary) {
  background: rgba(66, 153, 225, 0.3);
  border: 1px solid rgba(66, 153, 225, 0.4);
  color: #f0f0f0;
}

:deep(.el-button--primary:hover) {
  background: rgba(66, 153, 225, 0.4);
}
</style>
