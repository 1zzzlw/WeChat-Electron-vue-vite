<template>
  <div class="moments-count">
    <!-- 头部标题栏 -->
    <div class="moments-header">
      <div class="header-title">世界频道</div>
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
              <div class="post-text">{{ post.content }}</div>
              <!-- 图片展示 -->
              <div class="post-images" v-if="post.images && post.images.length > 0">
                <img v-for="(img, index) in post.images" :key="index" :src="img" class="post-image"
                  @click="previewImage(post.images, index)" />
              </div>
            </div>

            <!-- 互动区域 -->
            <div class="post-actions">
              <div class="action-item" :class="{ active: post.isLiked }" @click="handleLike(post.id)">
                <el-icon>
                  <StarFilled v-if="post.isLiked" />
                  <Star v-else />
                </el-icon>
                <span>{{ post.likeCount > 0 ? post.likeCount : '点赞' }}</span>
              </div>
              <div class="action-item" @click="handleComment(post.id)">
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

            <!-- 评论列表 -->
            <div class="comment-list" v-if="post.comments && post.comments.length > 0">
              <div class="comment-item" v-for="comment in post.comments" :key="comment.id">
                <img :src="comment.avatar" class="comment-avatar" />
                <div class="comment-content">
                  <div class="comment-user">{{ comment.username }}</div>
                  <div class="comment-text">{{ comment.content }}</div>
                  <div class="comment-footer">
                    <span class="comment-time">{{ comment.time }}</span>
                    <div class="comment-actions">
                      <div class="comment-action" :class="{ active: comment.isLiked }"
                        @click="handleCommentLike(post.id, comment.id)">
                        <el-icon>
                          <StarFilled v-if="comment.isLiked" />
                          <Star v-else />
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

    <!-- 发布动态对话框（已移除，改用新窗口） -->
  </div>
</template>

<script setup lang="ts">
import { ChatLineRound, Check, Coin, Plus, Star, StarFilled } from '@element-plus/icons-vue'
import { ref } from 'vue'

const scrollbarRef = ref()

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
        time: '1小时前',
        isLiked: false,
        likeCount: 3,
        replies: [
          {
            id: 101,
            username: '张三',
            replyTo: '李四',
            content: '谢谢夸奖！'
          }
        ]
      },
      {
        id: 2,
        username: '王五',
        avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
        content: '在哪里拍的呀？',
        time: '50分钟前',
        isLiked: true,
        likeCount: 1,
        replies: []
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
  },
  {
    id: 3,
    username: '王五',
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

const openPublishWindow = () => {
  // TODO: 创建新窗口来发布动态
  console.log('打开发布动态窗口')
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

const previewImage = (images: string[], index: number) => {
  // TODO: 实现图片预览功能
  console.log('预览图片:', images, index)
}

const handleCommentLike = (postId: number, commentId: number) => {
  const post = postList.value.find(p => p.id === postId)
  if (post && post.comments) {
    const comment = post.comments.find(c => c.id === commentId)
    if (comment) {
      comment.isLiked = !comment.isLiked
      comment.likeCount += comment.isLiked ? 1 : -1
    }
  }
}

const handleCommentReply = (postId: number, commentId: number, username: string) => {
  // TODO: 实现回复功能
  console.log('回复评论:', postId, commentId, '回复用户:', username)
}
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
  padding: 15px 0;
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
  margin: 0 15px 15px;
  padding: 16px;
  background: rgba(67, 243, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(67, 243, 255, 0.25);
  transition: all 0.3s ease;
}

.post-item:hover {
  background: rgba(67, 243, 255, 0.08);
  border-color: rgba(67, 243, 255, 0.4);
  box-shadow: 0 4px 12px rgba(67, 243, 255, 0.15);
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
  border: 2px solid rgba(67, 243, 255, 0.3);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: rgba(67, 243, 255, 0.6);
  box-shadow: 0 0 12px rgba(67, 243, 255, 0.3);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-size: 15px;
  font-weight: 600;
  color: #43f3ff;
}

.post-time {
  font-size: 12px;
  color: rgba(67, 243, 255, 0.6);
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
  transition: all 0.3s ease;
}

.follow-btn {
  background: rgba(67, 243, 255, 0.15);
  color: #43f3ff;
  border: 1px solid rgba(67, 243, 255, 0.4);
}

.follow-btn:hover {
  background: rgba(67, 243, 255, 0.25);
  box-shadow: 0 0 12px rgba(67, 243, 255, 0.3);
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
  border: 1px solid rgba(67, 243, 255, 0.2);
  transition: all 0.3s ease;
}

.post-image:hover {
  border-color: rgba(67, 243, 255, 0.4);
  box-shadow: 0 0 12px rgba(67, 243, 255, 0.3);
  transform: scale(1.02);
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid rgba(67, 243, 255, 0.15);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: rgba(67, 243, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(67, 243, 255, 0.1);
}

.action-item:hover {
  background: rgba(67, 243, 255, 0.2);
  color: #43f3ff;
  box-shadow: 0 0 10px rgba(67, 243, 255, 0.2);
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
  color: #ffd700;
  background: rgba(255, 215, 0, 0.12);
}

.comment-action.active:hover {
  background: rgba(255, 215, 0, 0.2);
}

.comment-action .el-icon {
  font-size: 13px;
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
</style>
