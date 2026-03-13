<template>
    <div class="favorite-count">
        <div class="favorite-content">
            <div class="title">
                <span>我的收藏</span>
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
                        <div class="item-type" :class="item.type === 'image' ? 'type-image' : 'type-text'">
                            {{ item.type === 'image' ? '图片' : '文本' }}
                        </div>

                        <!-- 内容区域 -->
                        <div class="item-body">
                            <!-- 文本内容 -->
                            <div v-if="item.type === 'text'" class="text-content">
                                {{ item.content }}
                            </div>

                            <!-- 图片内容 -->
                            <div v-else-if="item.type === 'image'" class="image-content">
                                <img :src="item.content" alt="收藏图片" @error="handleImageError">
                            </div>
                        </div>

                        <!-- 底部信息 -->
                        <div class="item-footer">
                            <span class="source" v-if="item.source_username">
                                来自: {{ item.source_username }}
                            </span>
                            <span class="time">{{ formatMessageTime(item.updated_at || item.created_at) }}</span>

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
import { ref, onMounted } from 'vue'
import { Star, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatMessageTime } from '../../utils/utils'

// 收藏列表数据
const favoritesList = ref<any[]>([])

// 滚动条引用
const scrollbarRef = ref()

/**
 * 处理点击收藏项
 * @param item 收藏项数据
 */
const handleItemClick = (item: any) => {
    if (item.type === 'image') {
        // 图片类型：可以打开预览
        previewImage(item.content)
    } else {
        // 文本类型：可以复制到剪贴板
        copyToClipboard(item.content)
    }
}

/**
 * 预览图片
 * @param url 图片URL
 */
const previewImage = (url: string) => {
    // TODO: 实现图片预览功能
    console.log('预览图片:', url)
    // 可以使用 ElImageViewer 或自定义弹窗
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 */
const copyToClipboard = (text: string) => {
    // TODO: 实现复制功能
    console.log('复制文本:', text)
}

/**
 * 图片加载错误处理
 */
const handleImageError = (e: Event) => {
    const target = e.target as HTMLImageElement
    target.src = '/placeholder.png' // 替换为默认图片
}

/**
 * 确认删除收藏
 * @param id 收藏ID
 */
const confirmDelete = async (id: string | number) => {
    try {
        await ElMessageBox.confirm('确定要删除这条收藏吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteFavorite(id)
    } catch (error) {
        // 用户取消
    }
}

/**
 * 删除收藏
 * @param id 收藏ID
 */
const deleteFavorite = async (id: string | number) => {
    try {
        // TODO: 1. 调用服务端API删除
        // await deleteFavoriteApi(id)

        // 2. 从本地列表中移除
        const index = favoritesList.value.findIndex(item => item.id === id)
        if (index !== -1) {
            favoritesList.value.splice(index, 1)
        }

        // 3. 从本地SQLite删除
        // await deleteFavoriteFromSQLite(id)

        ElMessage.success('删除成功')
    } catch (error) {
        ElMessage.error('删除失败')
    }
}

/**
 * 加载收藏列表
 */
const loadFavorites = async () => {
    try {
        // TODO: 1. 从本地SQLite加载
        // favoritesList.value = await getFavoritesFromSQLite()

        // 2. 如果本地为空，从服务端同步
        // if (favoritesList.value.length === 0) {
        //   const res = await getFavoritesApi()
        //   favoritesList.value = res.data
        //   // 同步到本地SQLite
        //   await syncFavoritesToSQLite(favoritesList.value)
        // }

        console.log('收藏列表:', favoritesList.value)
    } catch (error) {
        console.error('加载收藏失败:', error)
    }
}

onMounted(() => {
    loadFavorites()
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
    background: rgba(40, 50, 65, 0.95);
}

.favorite-content {
    width: 90%;
    height: 90%;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(66, 153, 225, 0.4);
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(66, 153, 225, 0.1);
    background: rgba(40, 50, 65, 0.95);
}

.title {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 500;
    color: #f5f5f5;
    background: rgba(50, 65, 85, 0.9);
    border-bottom: 1px solid rgba(66, 153, 225, 0.3);
    -webkit-app-region: drag;
}

.count-badge {
    padding: 2px 10px;
    background: rgba(66, 153, 225, 0.3);
    border-radius: 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
}

.favorite-content-view {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    background: rgba(40, 50, 65, 0.8);
    overflow: hidden;
}

/* 空状态 */
.empty-state {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(240, 240, 240, 0.5);
}

.empty-icon {
    font-size: 48px;
    color: rgba(66, 153, 225, 0.4);
}

.empty-text {
    font-size: 16px;
    color: rgba(240, 240, 240, 0.7);
}

.empty-tip {
    font-size: 13px;
    color: rgba(240, 240, 240, 0.4);
}

/* 收藏项 */
.favorite-item {
    margin: 8px 12px;
    padding: 12px 16px;
    background: rgba(50, 65, 85, 0.8);
    border-radius: 10px;
    border: 1px solid rgba(66, 153, 225, 0.25);
    transition: all 0.2s ease;
    position: relative;
    cursor: pointer;
}

.favorite-item:hover {
    background: rgba(55, 70, 90, 1);
    border-color: rgba(66, 153, 225, 0.4);
    box-shadow: 0 2px 8px rgba(66, 153, 225, 0.15);
}

/* 类型标签 */
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

.item-type.type-text {
    background: rgba(102, 126, 234, 0.8);
}

.item-type.type-image {
    background: rgba(231, 76, 60, 0.8);
}

/* 内容区域 */
.item-body {
    padding-right: 50px;
    margin-bottom: 10px;
}

/* 文本内容 */
.text-content {
    font-size: 14px;
    color: rgba(240, 242, 245, 0.9);
    line-height: 1.6;
    max-height: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    word-break: break-all;
    white-space: pre-wrap;
}

/* 图片内容 */
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
    border: 1px solid rgba(66, 153, 225, 0.2);
    display: block;
}

/* 底部信息 */
.item-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid rgba(66, 153, 225, 0.15);
}

.source {
    font-size: 12px;
    color: rgba(160, 180, 220, 0.7);
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.time {
    font-size: 12px;
    color: rgba(160, 180, 220, 0.6);
}

.item-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.action-icon {
    font-size: 16px;
    color: rgba(240, 240, 240, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px;
    border-radius: 4px;
}

.action-icon:hover {
    color: rgba(240, 240, 240, 0.85);
    background: rgba(255, 255, 255, 0.1);
}

.action-icon.delete:hover {
    color: #e74c3c;
    background: rgba(231, 76, 60, 0.15);
}

/* 滚动条样式 */
:deep(.el-scrollbar__bar) {
    background: rgba(66, 153, 225, 0.1);
}

:deep(.el-scrollbar__thumb) {
    background: rgba(66, 153, 225, 0.4);
    border-radius: 4px;
}

:deep(.el-scrollbar__thumb:hover) {
    background: rgba(66, 153, 225, 0.6);
}
</style>