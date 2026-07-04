<template>
    <div class="favorite-count">
        <div class="favorite-content">
            <div class="title">
                <span>全部收藏</span>
                <span class="count-badge">{{ favoritesList.length }}</span>
            </div>

            <div class="favorite-content-view">
                <el-scrollbar ref="scrollbarRef" noresize style="height: 100%; width: 100%">
                    <!-- 空状态 -->
                    <div v-if="favoritesList.length === 0" class="empty-state">
                        <el-icon class="empty-icon">
                            <Star />
                        </el-icon>
                        <div class="empty-text">暂无收藏</div>
                        <div class="empty-tip">右键消息点击"收藏"即可添加</div>
                    </div>

                    <!-- 收藏列表 -->
                    <div v-for="item in favoritesList" :key="item.id" class="favorite-item"
                        @click="handleItemClick(item)">
                        <!-- 类型标签 -->
                        <div class="item-type" :class="getTypeClass(item.type)">
                            {{ getTypeLabel(item.type) }}
                        </div>

                        <!-- 标题（笔记类型显示标题） -->
                        <div v-if="item.type === 0 && item.title" class="item-title">
                            {{ item.title }}
                        </div>

                        <!-- 内容区域 -->
                        <div class="item-body">
                            <!-- 笔记内容（tiptap HTML） -->
                            <div v-if="item.type === 0" class="note-content-html" v-html="item.content"></div>

                            <!-- 文本消息（HTML格式） -->
                            <div v-else-if="item.type === 1" class="text-content" v-html="item.content"></div>

                            <!-- 图片消息 -->
                            <div v-else-if="item.type === 2" class="image-content">
                                <img :src="item.content" alt="收藏图片" @error="handleImageError">
                            </div>

                            <!-- 视频消息 -->
                            <div v-else-if="item.type === 3" class="file-content">
                                <el-icon><VideoCamera /></el-icon>
                                <span>视频消息</span>
                            </div>

                            <!-- 文件消息 -->
                            <div v-else class="file-content">
                                <el-icon><Document /></el-icon>
                                <span>{{ item.title || '文件消息' }}</span>
                            </div>
                        </div>

                        <!-- 底部信息 -->
                        <div class="item-footer">
                            <span class="source" v-if="item.sourceUsername">
                                来自: {{ item.sourceUsername }}
                            </span>
                            <span class="time">{{ formatMessageTime(item.updatedAt || item.createdAt) }}</span>

                            <!-- 操作按钮 -->
                            <div class="item-actions" @click.stop>
                                <el-icon class="action-icon delete" @click="confirmDelete(item.id)">
                                    <Delete />
                                </el-icon>
                            </div>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Delete, Star, VideoCamera, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { getFavoritesAll, deleteFavorite } from '@/db/dualDB'
import { getFavoritesAllApi, deleteFavoriteApi } from '@/api/Favorites'
import emitter from '@/utils/mitt'
import { formatMessageTime } from '@/utils/utils'

// 收藏列表数据
const favoritesList = ref<any[]>([])

// 滚动条引用
const scrollbarRef = ref()

/**
 * 获取类型标签文字
 */
const getTypeLabel = (type: number) => {
    const map: Record<number, string> = {
        0: '笔记',
        1: '文本',
        2: '图片',
        3: '视频',
        4: '文件'
    }
    return map[type] || '其他'
}

/**
 * 获取类型标签CSS class
 */
const getTypeClass = (type: number) => {
    const map: Record<number, string> = {
        0: 'type-note',
        1: 'type-text',
        2: 'type-image',
        3: 'type-video',
        4: 'type-file'
    }
    return map[type] || 'type-text'
}

/**
 * 处理点击收藏项
 */
const handleItemClick = (item: any) => {
    if (item.type === 0) {
        // 笔记类型：打开笔记编辑窗口
        const data = { ...item }
        ;(window as any).windowToolApi.createNewWindow('createNote', data)
    } else if (item.type === 2) {
        // 图片类型：打开图片预览（构造与 imagePreview.vue 兼容的数据格式）
        const imageUrl = item.content
        const imageItem = {
            fileId: imageUrl,
            fileName: item.title || '收藏图片',
            fileSize: 0,
            remoteUrl: imageUrl
        }
        ;(window as any).windowToolApi.createNewWindow('imagePreview', {
            remoteUrl: imageUrl,
            currentImageId: imageUrl,
            imageUrlList: [imageItem]
        })
    } else if (item.type === 1) {
        // 文本类型：复制到剪贴板
        navigator.clipboard.writeText(item.content).then(() => {
            ElMessage.success('已复制到剪贴板')
        }).catch(() => {
            ElMessage.warning('复制失败')
        })
    }
}

/**
 * 图片加载错误处理
 */
const handleImageError = (e: Event) => {
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
}

/**
 * 确认删除收藏
 */
const confirmDelete = async (id: string | number) => {
    try {
        await ElMessageBox.confirm('确定要删除这条收藏吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        // 从本地数据库删除
        deleteFavorite(id)

        // 从列表中移除
        favoritesList.value = favoritesList.value.filter(item => String(item.id) !== String(id))

        ElMessage.success('删除成功')

        // 异步同步删除到服务端（不阻塞本地操作，失败静默记录）
        deleteFavoriteApi(id).catch(err => {
            console.warn('收藏删除同步到服务端失败（本地已删除）:', err)
        })
    } catch (error) {
        // 用户取消
    }
}

/**
 * 加载收藏列表（优先从服务端加载，失败回退本地数据库）
 */
const loadFavorites = async () => {
    try {
        // 优先从服务端获取全量收藏
        const res = await getFavoritesAllApi()
        if (res && res.data) {
            favoritesList.value = res.data
            console.log('收藏列表（服务端）:', favoritesList.value)
            return
        }
    } catch (error) {
        console.warn('从服务端加载收藏失败，回退本地数据库:', error)
    }

    // 回退到本地数据库
    try {
        favoritesList.value = await getFavoritesAll()
        console.log('收藏列表（本地）:', favoritesList.value)
    } catch (error) {
        console.error('加载本地收藏失败:', error)
    }
}

onMounted(() => {
    loadFavorites()

    // 监听笔记更新事件，刷新列表
    emitter.on('note:updated', loadFavorites)
})

onUnmounted(() => {
    emitter.off('note:updated', loadFavorites)
})
</script>

<style scoped>
.favorite-count {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    -webkit-app-region: no-drag;
    background: rgba(35, 45, 60, 0.7);
}

.favorite-content {
    width: 90%;
    height: 90%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(67, 243, 255, 0.4);
    box-shadow:
        0 8px 32px rgba(67, 243, 255, 0.15),
        0 0 0 1px rgba(67, 243, 255, 0.1);
    background: rgba(40, 50, 65, 0.75);
}

.title {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 600;
    color: #43f3ff;
    background: linear-gradient(135deg, rgba(67, 243, 255, 0.15) 0%, rgba(0, 217, 255, 0.1) 100%);
    border-bottom: 1px solid rgba(67, 243, 255, 0.3);
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
    -webkit-app-region: drag;
}

.count-badge {
    padding: 2px 10px;
    background: rgba(67, 243, 255, 0.2);
    border-radius: 10px;
    font-size: 12px;
    color: #43f3ff;
    border: 1px solid rgba(67, 243, 255, 0.3);
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.2);
}

.favorite-content-view {
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    background: rgba(35, 45, 60, 0.6);
    overflow: hidden;
}

.empty-state {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(67, 243, 255, 0.4);
}

.empty-icon {
    font-size: 48px;
    color: rgba(67, 243, 255, 0.5);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 0.5;
    }

    50% {
        opacity: 1;
    }
}

.empty-text {
    font-size: 16px;
    color: rgba(67, 243, 255, 0.7);
}

.empty-tip {
    font-size: 13px;
    color: rgba(67, 243, 255, 0.5);
}

.favorite-item {
    margin: 8px 12px;
    padding: 12px 16px;
    background: rgba(67, 243, 255, 0.05);
    border-radius: 10px;
    border: 1px solid rgba(67, 243, 255, 0.25);
    transition: all 0.3s ease;
    position: relative;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.favorite-item:hover {
    background: rgba(67, 243, 255, 0.1);
    border-color: rgba(67, 243, 255, 0.4);
    box-shadow: 0 2px 8px rgba(67, 243, 255, 0.2);
    transform: translateY(-2px);
}

.item-type {
    position: absolute;
    top: 10px;
    right: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
    opacity: 0.9;
}

.item-type.type-note {
    background: rgba(66, 153, 225, 0.6);
    box-shadow: 0 0 8px rgba(66, 153, 225, 0.3);
}

.item-type.type-text {
    background: rgba(67, 243, 255, 0.6);
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
}

.item-type.type-image {
    background: rgba(255, 118, 224, 0.6);
    box-shadow: 0 0 8px rgba(255, 118, 224, 0.3);
}

.item-type.type-video {
    background: rgba(255, 165, 0, 0.6);
    box-shadow: 0 0 8px rgba(255, 165, 0, 0.3);
}

.item-type.type-file {
    background: rgba(144, 147, 153, 0.6);
    box-shadow: 0 0 8px rgba(144, 147, 153, 0.3);
}

.item-title {
    font-size: 15px;
    font-weight: 600;
    color: #43f3ff;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(67, 243, 255, 0.2);
    text-shadow: 0 0 6px rgba(67, 243, 255, 0.2);
    padding-right: 50px;
}

.item-body {
    padding-right: 50px;
    margin-bottom: 10px;
}

.text-content {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    max-height: 80px;
    overflow: hidden;
    word-break: break-all;
    white-space: normal;
}

:deep(.text-content p) {
    margin: 0;
    padding: 0;
}

.image-content {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
}

.image-content img {
    width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid rgba(67, 243, 255, 0.2);
    display: block;
    transition: all 0.3s ease;
}

.image-content img:hover {
    border-color: rgba(67, 243, 255, 0.4);
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.3);
}

.file-content {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(67, 243, 255, 0.08);
    border-radius: 6px;
    border: 1px solid rgba(67, 243, 255, 0.15);
}

.file-content .el-icon {
    font-size: 20px;
    color: rgba(67, 243, 255, 0.7);
}

.file-content span {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
}

/* tiptap HTML渲染样式 */
.note-content-html {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    max-height: 100px;
    overflow: hidden;
}

:deep(.note-content-html img) {
    max-width: 30%;
    border-radius: 8px;
    margin: 8px auto;
    border: 2px solid rgba(67, 243, 255, 0.2);
    box-shadow: 0 2px 8px rgba(67, 243, 255, 0.15);
}

:deep(.note-content-html strong),
:deep(.note-content-html b) {
    font-weight: 900;
    color: #43f3ff;
    background: rgba(67, 243, 255, 0.15);
    padding: 0 3px;
    border-radius: 2px;
}

:deep(.note-content-html em),
:deep(.note-content-html i) {
    font-style: italic;
    color: rgba(255, 255, 255, 0.8);
}

:deep(.note-content-html h1) {
    font-size: 1.5em;
    font-weight: bold;
    margin: 0.5em 0 0.3em;
    color: #43f3ff;
}

:deep(.note-content-html h2) {
    font-size: 1.3em;
    font-weight: bold;
    margin: 0.4em 0 0.2em;
    color: #43f3ff;
}

:deep(.note-content-html h3) {
    font-size: 1.1em;
    font-weight: bold;
    margin: 0.3em 0 0.2em;
    color: rgba(67, 243, 255, 0.9);
}

:deep(.note-content-html p) {
    margin: 0.3em 0;
}

:deep(.note-content-html ul),
:deep(.note-content-html ol) {
    padding-left: 1.5rem;
    margin: 0.5em 0;
}

:deep(.note-content-html blockquote) {
    border-left: 3px solid rgba(67, 243, 255, 0.6);
    padding-left: 0.8rem;
    margin: 0.5em 0;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
    background: rgba(67, 243, 255, 0.05);
    padding: 0.3em 0.8rem;
    border-radius: 0 4px 4px 0;
}

:deep(.note-content-html code) {
    background: rgba(67, 243, 255, 0.15);
    color: #43f3ff;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
}

:deep(.note-content-html pre) {
    background: rgba(25, 30, 40, 0.8);
    border: 1px solid rgba(67, 243, 255, 0.3);
    border-radius: 6px;
    padding: 8px;
    margin: 0.5em 0;
    overflow-x: auto;
}

:deep(.note-content-html pre code) {
    background: none;
    color: #43f3ff;
    padding: 0;
    font-size: 0.9em;
    line-height: 1.5;
}

:deep(.note-content-html a) {
    color: #43f3ff;
    text-decoration: underline;
    text-underline-offset: 2px;
}

:deep(.note-content-html hr) {
    border: none;
    border-top: 1px solid rgba(67, 243, 255, 0.3);
    margin: 1em 0;
}

.item-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid rgba(67, 243, 255, 0.15);
}

.source {
    font-size: 12px;
    color: rgba(67, 243, 255, 0.7);
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.time {
    font-size: 12px;
    color: rgba(67, 243, 255, 0.6);
}

.item-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.action-icon {
    font-size: 16px;
    color: rgba(67, 243, 255, 0.6);
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 4px;
    border-radius: 4px;
}

.action-icon:hover {
    color: #43f3ff;
    background: rgba(67, 243, 255, 0.15);
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.3);
}

.action-icon.delete:hover {
    color: #ff4757;
    background: rgba(255, 71, 87, 0.15);
    box-shadow: 0 0 8px rgba(255, 71, 87, 0.3);
}

:deep(.el-scrollbar__bar) {
    background: rgba(67, 243, 255, 0.05);
}

:deep(.el-scrollbar__thumb) {
    background: rgba(67, 243, 255, 0.4);
    border-radius: 4px;
}

:deep(.el-scrollbar__thumb:hover) {
    background: rgba(67, 243, 255, 0.6);
}
</style>
