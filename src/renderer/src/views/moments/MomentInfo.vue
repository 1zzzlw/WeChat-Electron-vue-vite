<template>
    <div class="moment-info-container">
        <!-- 侧边导航栏 -->
        <div class="sidebar" :class="{ 'is-collapsed': isSidebarCollapsed }">
            <div class="sidebar-header">
                <span v-show="!isSidebarCollapsed">目录</span>
                <button class="toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
                    <el-icon>
                        <Fold v-if="!isSidebarCollapsed" />
                        <Expand v-else />
                    </el-icon>
                </button>
            </div>
            <div class="sidebar-content" v-show="!isSidebarCollapsed">
                <div v-if="headings.length === 0" class="empty-nav">暂无标题</div>
                <div v-for="(heading, index) in headings" :key="index" class="nav-item"
                    :class="[`level-${heading.level}`, { 'is-active': activeHeadingIndex === index }]"
                    @click="scrollToHeading(index)">
                    <span class="nav-dot"></span>
                    <span class="nav-text">{{ heading.text }}</span>
                </div>
            </div>
        </div>

        <!-- 主体内容区 -->
        <div class="main-content">
            <!-- 头部用户信息栏 -->
            <div class="header">
                <div class="header-left">
                    <img :src="momentInfo?.avatar" alt="头像" class="user-avatar" />
                    <div class="user-details">
                        <div class="username">{{ momentInfo?.username }}</div>
                        <div class="publish-time">{{ momentInfo?.publishTime }}</div>
                    </div>
                </div>
                <div class="header-actions">
                    <el-button v-if="!momentInfo?.isFollowed" class="follow-btn" @click="handleFollow">
                        <el-icon>
                            <Plus />
                        </el-icon>
                        关注
                    </el-button>
                    <el-button v-else class="followed-btn" disabled>
                        <el-icon>
                            <Check />
                        </el-icon>
                        已关注
                    </el-button>
                </div>
            </div>

            <!-- 帖子内容区 -->
            <div class="content-main" ref="contentMainRef" @scroll="handleScroll">
                <div class="post-content-wrapper">
                    <div class="post-text-wrapper" v-html="momentInfo?.content"></div>
                </div>

                <!-- 互动操作区 -->
                <div class="interaction-area">
                    <div class="likes-section">
                        <div class="likes-header">
                            <span class="likes-label">点赞 ({{ momentInfo?.likeCount }})</span>
                        </div>
                        <div class="likes-avatars">
                            <img v-for="liker in momentInfo?.likers" :key="liker.id" :src="liker.avatar"
                                :title="liker.username" class="liker-avatar" />
                        </div>
                    </div>
                    <div class="actions-bar">
                        <div class="action-item" :class="{ active: momentInfo?.liked }" @click="handleLike">
                            <el-icon><i class="iconfont icon-xihuan"
                                    :class="{ 'is-liked': momentInfo?.liked }" /></el-icon>
                            <span>{{ momentInfo?.liked ? '已点赞' : '点赞' }}</span>
                        </div>
                        <div class="action-item" @click="handleReward">
                            <el-icon>
                                <Coin />
                            </el-icon>
                            <span>打赏</span>
                        </div>
                    </div>
                </div>

                <!-- 评论输入框 -->
                <div class="comment-input-area">
                    <img :src="userAvatar" alt="我的头像" class="my-avatar" />
                    <div class="input-wrapper">
                        <textarea v-model="commentContent" placeholder="写下你的评论..." class="comment-textarea"
                            @keydown.enter.ctrl="handleSendComment" spellcheck="false"></textarea>
                        <div class="input-actions">
                            <span class="tip-text">Ctrl + Enter 发送</span>
                            <el-button type="primary" class="send-btn" :disabled="!commentContent.trim()"
                                @click="handleSendComment">
                                发送
                            </el-button>
                        </div>
                    </div>
                </div>

                <!-- 评论区 -->
                <div class="comments-section">
                    <div class="comments-header">
                        <span class="comments-title">评论 ({{ momentInfo?.commentCount }})</span>
                    </div>
                    <div class="comments-list">
                        <div v-for="comment in momentInfo?.comments" :key="comment.id" class="comment-item">
                            <img :src="comment.avatar" class="comment-avatar" />
                            <div class="comment-content">
                                <div class="comment-user">{{ comment.username }}</div>
                                <div class="comment-text">{{ comment.content }}</div>
                                <div class="comment-footer">
                                    <span class="comment-time">{{ formatMomentsTime(comment.publishTime) }}</span>
                                    <div class="comment-actions">
                                        <div class="comment-action" :class="{ active: comment.liked }"
                                            @click="handleCommentLike(comment.id)">
                                            <el-icon><i class="iconfont icon-xihuan"
                                                    :class="{ 'is-liked': comment.liked }" /></el-icon>
                                            <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
                                        </div>
                                        <div class="comment-action"
                                            @click="handleCommentReply(comment.id, comment.username)">
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
                                        <span class="reply-to" v-if="reply.replyToUsername"> 回复 {{ reply.replyToUsername }}</span>
                                        <span class="reply-text">: {{ reply.content }}</span>
                                    </div>
                                    <div class="load-more-replies" v-if="hasMoreReplies(comment.id)" @click="handleLoadMoreReplies(comment.id)">
                                        查看更多回复
                                    </div>
                                </div>
                                <!-- 回复输入框 -->
                                <div class="reply-input-area" v-if="replyingToCommentId === comment.id">
                                    <textarea v-model="replyCommentContent"
                                        :placeholder="'回复 ' + replyingToUsername + '...'"
                                        class="reply-textarea" @keydown.enter.ctrl="handleSendReply"
                                        spellcheck="false"></textarea>
                                    <div class="reply-input-actions">
                                        <span class="tip-text">Ctrl + Enter 发送</span>
                                        <el-button type="primary" class="reply-send-btn"
                                            :disabled="!replyCommentContent.trim()" @click="handleSendReply">
                                            发送
                                        </el-button>
                                        <div class="reply-cancel-btn" @click="handleCancelReply">取消</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="load-more-comments" v-if="hasMoreComments" @click="handleLoadMoreComments">
                        加载更多评论
                    </div>
                </div>
            </div>
        </div>

        <!-- 窗口控制器 -->
        <WindowControls windowType="momentInfoView" />
    </div>
</template>

<script lang="ts" setup>
import { ChatLineRound, Check, Coin, Expand, Fold, Plus } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'
import WindowControls from '../../components/WindowControls.vue'
import { momentDetail, publishComment, comments, replies } from '../../api/Moments.js'
import { MomentsItem } from '../../types/moments.ts'
import { ElMessage } from 'element-plus'
import { formatMomentsTime } from '../../utils/utils.js'

const isSidebarCollapsed = ref(false)
const contentMainRef = ref<HTMLElement | null>(null)
const activeHeadingIndex = ref(-1)
const userAvatar = ref()
const momentInfo = ref<MomentsItem>()
const commentContent = ref('')

// 一级评论分页状态
const commentPageDTO = ref({
    momentId: 0,
    page: 1,
    pageSize: 10
})
const totalCommentCount = ref(0)
const hasMoreComments = computed(() => {
    if (!momentInfo.value?.comments) return false
    return momentInfo.value.comments.length < totalCommentCount.value
})

// 二级评论分页状态：每条一级评论独立维护
const replyPageMap = ref<Map<number, { page: number, pageSize: number, total: number }>>(new Map())
const hasMoreReplies = (commentId: number): boolean => {
    const state = replyPageMap.value.get(commentId)
    if (!state) return false
    const comment = momentInfo.value?.comments?.find(c => c.id === commentId)
    if (!comment?.replies) return false
    return comment.replies.length < state.total
}

// 提取标题列表
const headings = computed(() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(momentInfo.value?.content as string, 'text/html')
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const list: { level: number, text: string }[] = []

    headingElements.forEach((el) => {
        const level = parseInt(el.tagName.charAt(1))
        const text = el.textContent || ''
        if (text) {
            list.push({ level, text })
        }
    })
    return list
})

// 处理滚动
const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    if (!contentMainRef.value) return

    const headingElements = contentMainRef.value.querySelectorAll('.post-text-wrapper h1, .post-text-wrapper h2, .post-text-wrapper h3, .post-text-wrapper h4, .post-text-wrapper h5, .post-text-wrapper h6')
    let currentActive = -1

    headingElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        const parentRect = contentMainRef.value!.getBoundingClientRect()
        if (rect.top >= parentRect.top && rect.top <= parentRect.top + 100) {
            currentActive = index
        }
    })

    if (currentActive !== -1) {
        activeHeadingIndex.value = currentActive
    }
}

// 平滑滚动到标题
const scrollToHeading = (index: number) => {
    if (!contentMainRef.value) return
    const headingElements = contentMainRef.value.querySelectorAll('.post-text-wrapper h1, .post-text-wrapper h2, .post-text-wrapper h3, .post-text-wrapper h4, .post-text-wrapper h5, .post-text-wrapper h6')
    if (headingElements[index]) {
        activeHeadingIndex.value = index
        headingElements[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
}

// 事件处理方法
const handleFollow = () => {
    console.log('关注用户')
}

const handleLike = () => {
    console.log('点赞/取消点赞')
}

const handleReward = () => {
    console.log('打赏')
}

const handleCommentLike = (commentId: number) => {
    console.log('点赞评论:', commentId)
}

// 回复输入框状态：同一时刻只显示一个
const replyingToCommentId = ref<number | null>(null)
const replyingToUsername = ref('')
const replyCommentContent = ref('')

const handleCommentReply = (commentId: number, username: string) => {
    replyingToCommentId.value = commentId
    replyingToUsername.value = username
    replyCommentContent.value = ''
}

const handleCancelReply = () => {
    replyingToCommentId.value = null
    replyingToUsername.value = ''
    replyCommentContent.value = ''
}

const handleSendReply = () => {
    console.log('发送回复, parentId:', replyingToCommentId.value, '内容:', replyCommentContent.value)
}

const handleSendComment = async () => {
    const content = commentContent.value
    commentContent.value = ''
    const data = {
        momentId: momentInfo.value?.id,
        content: content
    }
    const res = await publishComment(data)
    if (momentInfo.value) {
        if (!momentInfo.value.comments) {
            momentInfo.value.comments = []
        }
        // 临时生成一个时间
        const time = new Date().getTime()
        res.data.publishTime = formatMomentsTime(time)
        // 推进去
        momentInfo.value.comments.unshift(res.data)

        // 评论数量 +1
        if (momentInfo.value.commentCount != null) {
            momentInfo.value.commentCount += 1
        }
    }
    ElMessage.success("发布评论成功")
}

// 加载更多一级评论
const handleLoadMoreComments = () => {
    commentPageDTO.value.page += 1
    getComments()
}

// 加载更多二级评论
const handleLoadMoreReplies = (commentId: number) => {
    const state = replyPageMap.value.get(commentId)
    if (!state) {
        replyPageMap.value.set(commentId, { page: 1, pageSize: 5, total: 0 })
    }
    const replyState = replyPageMap.value.get(commentId)!
    replyState.page += 1
    getReplies(commentId)
}

// electron通信
const windowIPC = async () => {
    (window as any).windowToolApi.sendWindowInfo(async (e: any, data: any) => {
        const res = await momentDetail(data)
        momentInfo.value = res.data

        commentPageDTO.value.momentId = res.data.id
        await getComments()
    })

    userAvatar.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
}

// 一级评论获取
const getComments = async () => {
    if (!commentPageDTO.value.momentId) return

    console.log(commentPageDTO.value)
    const res = await comments(commentPageDTO.value)

    if (res.data) {
        totalCommentCount.value = res.data.total

        // 确保 comments 数组存在
        if (!momentInfo.value?.comments) {
            if (momentInfo.value) {
                momentInfo.value.comments = []
            }
        }

        // 如果是第一页，直接赋值；如果是加载更多，则追加
        if (commentPageDTO.value.page === 1) {
            if (momentInfo.value) {
                momentInfo.value.comments = res.data.data || []
            }
            // 初始化每条一级评论的回复分页状态
            momentInfo.value?.comments?.forEach(comment => {
                if (!replyPageMap.value.has(comment.id)) {
                    replyPageMap.value.set(comment.id, { page: 1, pageSize: 5, total: 0 })
                }
            })
        } else {
            res.data.data?.forEach((comment: any) => {
                momentInfo.value?.comments?.push(comment)
                if (!replyPageMap.value.has(comment.id)) {
                    replyPageMap.value.set(comment.id, { page: 1, pageSize: 5, total: 0 })
                }
            })
        }
    }
}

// 二级评论获取
const getReplies = async (commentId: number) => {
    const state = replyPageMap.value.get(commentId)
    if (!state) return

    console.log('加载回复, parentId:', commentId, 'page:', state.page)
    const res = await replies({ parentId: commentId, page: state.page, pageSize: state.pageSize })

    if (res.data) {
        state.total = res.data.total

        const comment = momentInfo.value?.comments?.find(c => c.id === commentId)
        if (!comment) return

        if (!comment.replies) {
            comment.replies = []
        }

        if (state.page === 1) {
            comment.replies = res.data.data || []
        } else {
            res.data.data?.forEach((reply: any) => {
                comment.replies.push(reply)
            })
        }
    }
}
onMounted(async () => {
    await windowIPC()
})
</script>

<style scoped>
.moment-info-container {
    width: 100%;
    height: 100%;
    display: flex;
    background: rgba(28, 38, 50, 0.4);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    color: #f0f2f5;
    overflow: hidden;
}

/* 侧边导航栏样式 */
.sidebar {
    width: 220px;
    height: 100%;
    background: rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(67, 243, 255, 0.15);
    display: flex;
    flex-direction: column;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    z-index: 10;
}

.sidebar.is-collapsed {
    width: 50px;
}

.sidebar-header {
    height: 50px;
    padding: 0 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(67, 243, 255, 0.1);
    color: #43f3ff;
    font-weight: 600;
    font-size: 14px;
}

.toggle-btn {
    background: transparent;
    border: none;
    color: #43f3ff;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
}

.toggle-btn:hover {
    background: rgba(67, 243, 255, 0.1);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px 0;
}

.nav-item {
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
    position: relative;
    font-size: 13px;
    color: rgba(240, 242, 245, 0.7);
}

.nav-item:hover {
    background: rgba(67, 243, 255, 0.08);
    color: #43f3ff;
}

.nav-item.is-active {
    background: rgba(67, 243, 255, 0.12);
    color: #43f3ff;
    font-weight: 600;
}

.nav-item.is-active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #43f3ff;
    box-shadow: 0 0 8px #43f3ff;
}

.nav-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(67, 243, 255, 0.3);
    flex-shrink: 0;
}

.nav-item.level-1 {
    padding-left: 20px;
    font-weight: 500;
}

.nav-item.level-2 {
    padding-left: 35px;
    font-size: 12px;
}

.nav-item.level-3 {
    padding-left: 45px;
    font-size: 11px;
    opacity: 0.8;
}

.nav-item.level-4,
.nav-item.level-5,
.nav-item.level-6 {
    padding-left: 55px;
    font-size: 11px;
    opacity: 0.6;
}

.nav-item.level-2 .nav-dot {
    width: 4px;
    height: 4px;
}

.nav-item.level-3 .nav-dot {
    width: 3px;
    height: 3px;
}

.empty-nav {
    text-align: center;
    color: rgba(67, 243, 255, 0.3);
    font-size: 12px;
    margin-top: 20px;
}

/* 主内容区 */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
}

.header {
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(67, 243, 255, 0.2);
    -webkit-app-region: drag;
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid rgba(67, 243, 255, 0.3);
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
    color: #43f3ff;
}

.publish-time {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
}

.header-actions {
    -webkit-app-region: no-drag;
    margin-right: 110px;
}

.follow-btn,
.followed-btn {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
    border-radius: 6px;
    padding: 6px 18px;
    height: 32px;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.follow-btn:hover {
    background: rgba(67, 243, 255, 0.35) !important;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(67, 243, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

.followed-btn {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.3) !important;
    cursor: default;
}

/* 内容滚动区 */
.content-main {
    flex: 1;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.01);
}

.post-content-wrapper {
    padding: 30px 40px;
    min-height: 200px;
}

.post-text-wrapper {
    font-size: 15px;
    line-height: 1.8;
    color: #f0f2f5;
    word-break: break-word;
}

.post-text-wrapper :deep(h1) {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin: 1.5em 0 0.8em;
    padding-bottom: 0.3em;
    border-bottom: 2px solid rgba(67, 243, 255, 0.3);
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.post-text-wrapper :deep(h2) {
    font-size: 22px;
    font-weight: 600;
    color: #e0faff;
    margin: 1.4em 0 0.6em;
    display: flex;
    align-items: center;
    line-height: 1.3;
}

.post-text-wrapper :deep(h2::before) {
    content: '';
    width: 4px;
    height: 18px;
    background: #43f3ff;
    margin-right: 12px;
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.5);
}

.post-text-wrapper :deep(h3) {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 1.2em 0 0.5em;
    line-height: 1.4;
}

.post-text-wrapper :deep(p) {
    margin: 0.5em 0;
    font-size: 15px;
    color: rgba(240, 242, 245, 0.9);
    line-height: 1.8;
}

.post-text-wrapper :deep(blockquote) {
    border-left: 4px solid rgba(67, 243, 255, 0.5);
    background: rgba(67, 243, 255, 0.05);
    padding: 12px 20px;
    margin: 20px 0;
    border-radius: 0 8px 8px 0;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
}

.post-text-wrapper :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 20px auto;
    display: block;
    border: 1px solid rgba(67, 243, 255, 0.2);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.post-text-wrapper :deep(ul),
.post-text-wrapper :deep(ol) {
    margin: 1em 0;
    padding-left: 2em;
}

.post-text-wrapper :deep(li) {
    margin: 0.5em 0;
}

/* 互动操作区 */
.interaction-area {
    padding: 20px 40px;
    border-top: 1px solid rgba(67, 243, 255, 0.15);
    background: rgba(67, 243, 255, 0.02);
}

.likes-section {
    margin-bottom: 15px;
}

.likes-header {
    margin-bottom: 10px;
}

.likes-label {
    font-size: 13px;
    color: rgba(67, 243, 255, 0.8);
    font-weight: 500;
}

.likes-avatars {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.liker-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid rgba(67, 243, 255, 0.2);
    transition: transform 0.2s;
}

.liker-avatar:hover {
    transform: scale(1.1);
    border-color: rgba(67, 243, 255, 0.5);
}

.actions-bar {
    display: flex;
    gap: 20px;
    padding-top: 15px;
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
    padding: 6px 12px;
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

/* 评论区 */
.comments-section {
    padding: 20px 40px;
    border-top: 1px solid rgba(67, 243, 255, 0.15);
}

.comments-header {
    margin-bottom: 20px;
}

.comments-title {
    font-size: 14px;
    font-weight: 600;
    color: #43f3ff;
}

.comments-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.comment-item {
    display: flex;
    gap: 10px;
    padding: 12px;
    border-radius: 8px;
    background: rgba(67, 243, 255, 0.05);
    transition: all 0.3s ease;
}

.comment-item:hover {
    background: rgba(67, 243, 255, 0.08);
}

.comment-avatar {
    width: 36px;
    height: 36px;
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
    margin-bottom: 6px;
}

.comment-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
}

.comment-time {
    font-size: 11px;
    color: rgba(67, 243, 255, 0.6);
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

.reply-list {
    margin-top: 10px;
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

.load-more-replies {
    margin-top: 8px;
    padding: 6px 12px;
    font-size: 12px;
    color: rgba(67, 243, 255, 0.7);
    background: rgba(67, 243, 255, 0.08);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-block;
    text-align: center;
}

.load-more-replies:hover {
    background: rgba(67, 243, 255, 0.15);
    color: #43f3ff;
}

/* 回复输入框 */
.reply-input-area {
    margin-top: 10px;
    padding: 10px 12px;
    background: rgba(67, 243, 255, 0.05);
    border: 1px solid rgba(67, 243, 255, 0.2);
    border-radius: 6px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.reply-textarea {
    width: 100%;
    min-height: 50px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(67, 243, 255, 0.15);
    border-radius: 4px;
    color: #f0f2f5;
    font-size: 12px;
    line-height: 1.5;
    resize: none;
    outline: none;
    transition: all 0.3s ease;
    font-family: inherit;
}

.reply-textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.reply-textarea:focus {
    border-color: rgba(67, 243, 255, 0.4);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 2px rgba(67, 243, 255, 0.1);
}

.reply-textarea::-webkit-scrollbar {
    width: 6px;
}

.reply-textarea::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.2);
    border-radius: 3px;
}

.reply-textarea::-webkit-scrollbar-thumb:hover {
    background: rgba(67, 243, 255, 0.4);
}

.reply-textarea::-webkit-scrollbar-track {
    background: transparent;
}

.reply-input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
}

.reply-send-btn {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
    border-radius: 4px;
    padding: 4px 16px;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.3s ease;
}

.reply-send-btn:hover:not(:disabled) {
    background: rgba(67, 243, 255, 0.35) !important;
}

.reply-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.reply-cancel-btn {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.reply-cancel-btn:hover {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.05);
}

/* 评论输入区 */

/* 加载更多一级评论 */
.load-more-comments {
    margin-top: 15px;
    padding: 10px 0;
    text-align: center;
    font-size: 13px;
    color: rgba(67, 243, 255, 0.7);
    background: rgba(67, 243, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.load-more-comments:hover {
    background: rgba(67, 243, 255, 0.15);
    color: #43f3ff;
}

.comment-input-area {
    padding: 20px 40px;
    border-top: 1px solid rgba(67, 243, 255, 0.15);
    background: rgba(67, 243, 255, 0.02);
    display: flex;
    gap: 12px;
}

.my-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(67, 243, 255, 0.3);
    flex-shrink: 0;
}

.input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.comment-textarea {
    width: 100%;
    min-height: 80px;
    padding: 12px 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(67, 243, 255, 0.2);
    border-radius: 8px;
    color: #f0f2f5;
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
    outline: none;
    transition: all 0.3s ease;
    font-family: inherit;
    resize: none;
}

.comment-textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.comment-textarea:focus {
    border-color: rgba(67, 243, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(67, 243, 255, 0.1);
}

.comment-textarea::-webkit-scrollbar {
    width: 6px;
}

.comment-textarea::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.2);
    border-radius: 3px;
}

.comment-textarea::-webkit-scrollbar-thumb:hover {
    background: rgba(67, 243, 255, 0.4);
}

.comment-textarea::-webkit-scrollbar-track {
    background: transparent;
}

.input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tip-text {
    font-size: 12px;
    color: rgba(67, 243, 255, 0.5);
}

.send-btn {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
    border-radius: 6px;
    padding: 8px 24px;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.send-btn:hover:not(:disabled) {
    background: rgba(67, 243, 255, 0.35) !important;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(67, 243, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
}

.send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* 滚动条 */
.sidebar-content::-webkit-scrollbar,
.content-main::-webkit-scrollbar {
    width: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb,
.content-main::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.15);
    border-radius: 2px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover,
.content-main::-webkit-scrollbar-thumb:hover {
    background: rgba(67, 243, 255, 0.3);
}

/* 响应式适配 */
@media (max-width: 768px) {
    .sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: rgba(28, 38, 50, 0.95);
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
    }

    .sidebar.is-collapsed {
        width: 0;
        border: none;
        overflow: hidden;
    }

    .post-content-wrapper,
    .interaction-area,
    .comments-section {
        padding-left: 20px;
        padding-right: 20px;
    }
}
</style>
