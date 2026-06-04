<template>
  <div class="moments-count">
    <!-- 头部标题栏 -->
    <div class="moments-header">
      <div class="header-title">世界频道</div>
    </div>

    <!-- 帖子列表 -->
    <div class="moments-content">
      <el-scrollbar ref="scrollbarRef" style="height: 100%; width: 100%">
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
                <img v-for="(img, index) in post.images" :key="index" :src="img" class="post-image" loading="lazy"
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

    <!-- 发布动态对话框（已移除，改用新窗口） -->
  </div>
</template>

<script setup lang="ts">
import { ChatLineRound, Check, Coin, Plus, Star, StarFilled } from '@element-plus/icons-vue'
import { ref } from 'vue'

const scrollbarRef = ref()

const isReflowing = ref(false)
let resizeTimer: NodeJS.Timeout | null = null

// const postList = ref([])

// 模拟数据
const postList = ref([
  {
    id: 1,
    username: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    time: '2小时前',
    content: '今天天气真不错，适合出去走走！分享一些随手拍的照片～',
    images: [
      'https://picsum.photos/id/10/800/600',
      'https://picsum.photos/id/11/800/600'
    ],
    isLiked: false,
    likeCount: 23,
    commentCount: 2,
    isFollowed: false,
    showComments: false,
    comments: [
      {
        id: 1,
        username: '李四',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
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
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
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
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    time: '3小时前',
    content: '最近在研究 Electron + Vue3，感觉这套组合真的很强大！',
    images: [
      'https://picsum.photos/id/20/800/600'
    ],
    isLiked: true,
    likeCount: 15,
    commentCount: 3,
    isFollowed: true,
    showComments: false,
    comments: [
      {
        id: 3,
        username: '张三',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        content: '确实，开发效率很高。',
        time: '2小时前',
        isLiked: false,
        likeCount: 2,
        replies: []
      },
      {
        id: 4,
        username: '小明',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Spooky',
        content: '求教程分享！',
        time: '1小时前',
        isLiked: true,
        likeCount: 5,
        replies: []
      },
      {
        id: 5,
        username: '小红',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fluffy',
        content: '我也在学，一起交流。',
        time: '30分钟前',
        isLiked: false,
        likeCount: 0,
        replies: []
      }
    ]
  },
  {
    id: 3,
    username: '王五',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    time: '5小时前',
    content: '周末的咖啡时光 ☕️',
    images: [
      'https://picsum.photos/id/30/800/600',
      'https://picsum.photos/id/31/800/600',
      'https://picsum.photos/id/32/800/600'
    ],
    isLiked: false,
    likeCount: 45,
    commentCount: 1,
    isFollowed: false,
    showComments: false,
    comments: [
      {
        id: 6,
        username: '小美',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cuddles',
        content: '这家店在哪？看着不错。',
        time: '4小时前',
        isLiked: true,
        likeCount: 3,
        replies: []
      }
    ]
  },
  {
    id: 4,
    username: '赵六',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tigger',
    time: '昨天',
    content: '新买的机械键盘，手感绝了！',
    images: [
      'https://picsum.photos/id/40/800/600'
    ],
    isLiked: true,
    likeCount: 88,
    commentCount: 2,
    isFollowed: false,
    showComments: false,
    comments: [
      {
        id: 7,
        username: '阿强',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
        content: '什么轴的？',
        time: '20小时前',
        isLiked: false,
        likeCount: 1,
        replies: [
          {
            id: 102,
            username: '赵六',
            replyTo: '阿强',
            content: '红轴，打字很舒服。'
          }
        ]
      },
      {
        id: 8,
        username: '老王',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
        content: '入坑预警！',
        time: '18小时前',
        isLiked: true,
        likeCount: 10,
        replies: []
      }
    ]
  },
  {
    id: 8,
    username: '小明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Spooky',
    time: '1小时前',
    content: '瀑布流布局测试中... 这是一个比较长的动态内容，用来测试不同高度的卡片在瀑布流中的排列效果。技术改变生活，代码编织世界！我们需要更多的内容来填充这个区域。',
    images: [],
    isLiked: false,
    likeCount: 10,
    commentCount: 1,
    isFollowed: false,
    showComments: false,
    comments: [
      {
        id: 9,
        username: '张三',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        content: '效果看着很棒！',
        time: '30分钟前',
        isLiked: true,
        likeCount: 2,
        replies: []
      }
    ]
  },
  {
    id: 9,
    username: '小红',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fluffy',
    time: '30分钟前',
    content: '今天也要元气满满哦！',
    images: [
      'https://picsum.photos/id/50/800/600'
    ],
    isLiked: true,
    likeCount: 99,
    commentCount: 2,
    isFollowed: true,
    showComments: false,
    comments: [
      {
        id: 10,
        username: '小明',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Spooky',
        content: '加油加油！',
        time: '20分钟前',
        isLiked: false,
        likeCount: 1,
        replies: []
      },
      {
        id: 11,
        username: '小美',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cuddles',
        content: '元气少女上线。',
        time: '10分钟前',
        isLiked: true,
        likeCount: 5,
        replies: []
      }
    ]
  },
  {
    id: 10,
    username: '阿强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
    time: '10分钟前',
    content: '分享一组极简风摄影，希望大家喜欢。',
    images: [
      'https://picsum.photos/id/60/800/600',
      'https://picsum.photos/id/61/800/600'
    ],
    isLiked: false,
    likeCount: 15,
    commentCount: 1,
    isFollowed: false,
    showComments: false,
    comments: [
      {
        id: 12,
        username: '老王',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
        content: '构图很有深度。',
        time: '5分钟前',
        isLiked: true,
        likeCount: 2,
        replies: []
      }
    ]
  },
  {
    id: 11,
    username: '老王',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    time: '刚刚',
    content: '这就是全屏下动态增加列数的秘密！大家觉得这个瀑布流怎么样？',
    images: [],
    isLiked: true,
    likeCount: 66,
    commentCount: 1,
    isFollowed: true,
    showComments: false,
    comments: [
      {
        id: 13,
        username: '阿强',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
        content: '非常丝滑！',
        time: '刚刚',
        isLiked: false,
        likeCount: 0,
        replies: []
      }
    ]
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
  const post = postList.value.find(p => p.id === postId)
  if (post) {
    post.showComments = !post.showComments
  }
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
  padding: 16px;
  background: rgba(67, 243, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(67, 243, 255, 0.25);
  transition: all 0.3s ease;
  animation: cardEnter 0.5s ease forwards;
  opacity: 0;
  transform: translateY(20px);
}

/* 给每个卡片加延迟，形成错落效果 */
.post-item:nth-child(3n+1) {
  animation-delay: 0.1s;
}

.post-item:nth-child(3n+2) {
  animation-delay: 0.2s;
}

.post-item:nth-child(3n+3) {
  animation-delay: 0.3s;
}

@keyframes cardEnter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.post-item:hover {
  background: rgba(67, 243, 255, 0.08);
  border-color: rgba(67, 243, 255, 0.4);
  box-shadow: 0 6px 20px rgba(67, 243, 255, 0.2);
  transform: translateY(-2px);
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
  opacity: 0;
  animation: imageFadeIn 0.4s ease forwards;
}

@keyframes imageFadeIn {
  to {
    opacity: 1;
  }
}

.post-images:has(img:only-child) {
  grid-template-columns: 1fr;
}

.post-images:has(img:nth-child(2):last-child) {
  grid-template-columns: repeat(2, 1fr);
}

.post-image {
  width: 100%;
  height: auto;
  max-height: 200px;
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
  justify-content: space-between;
  /* 按钮之间均匀分布 */
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(67, 243, 255, 0.15);
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  border-radius: 6px;
  font-size: 13px;
  color: rgba(67, 243, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(67, 243, 255, 0.1);
  white-space: nowrap;
  flex: 1;
  max-width: 90px;
  height: 32px;
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
