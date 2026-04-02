<template>
    <div class="notification">
        <!-- 关闭按钮 -->
        <el-icon class="close-btn" @click="emit('close')">
            <Close />
        </el-icon>

        <!-- 内容区域 -->
        <div class="notification-content">
            <!-- 头像区域 -->
            <div class="avatar-wrapper">
                <img :src="avatar" alt="群成员头像" class="notification-avatar" />
            </div>

            <!-- 文字信息 -->
            <div class="notification-info">
                <div class="notification-title">
                    <span class="member-name">{{ name }}</span>
                    <span class="group-name">· {{ groupName }}</span>
                </div>
                <div class="status-text">已退出群聊</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
    avatar: String,
    name: String,
    groupName: String
})

const emit = defineEmits(['close'])
</script>

<style scoped>
.notification {
    width: 320px;
    height: 100px;
    flex-shrink: 0;
    position: relative;
    /* 新增：让关闭按钮绝对定位生效 */

    /* 毛玻璃核心效果 */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    /* 群聊退出风格：橙色系边框+阴影（和删除好友保持视觉统一） */
    border-radius: 12px;
    border: 1px solid rgba(255, 136, 77, 0.3);
    box-shadow: 0 8px 32px rgba(255, 81, 0, 0.15);

    overflow: hidden;
    -webkit-app-region: no-drag;
}

/* 悬浮交互效果 */
.notification {
    transition: all 0.2s ease;
    cursor: pointer;
}

.notification:hover {
    transform: scale(1.02);
    box-shadow: 0 12px 40px rgba(255, 81, 0, 0.25);
    border-color: rgba(255, 136, 77, 0.4);
}

/* 关闭按钮样式（和原卡片保持一致） */
.close-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff884d;
    /* 匹配主题色 */
    font-size: 14px;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s ease;
    z-index: 2;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* 内容区域布局 */
.notification-content {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 16px 0 14px;
    gap: 12px;
    box-sizing: border-box;
}

.avatar-wrapper {
    position: relative;
    flex-shrink: 0;
}

.notification-avatar {
    width: 60px;
    height: 60px;
    border-radius: 15px;
    object-fit: cover;
    border: 2px solid rgba(255, 136, 77, 0.2);
    /* 头像兜底：防止图片加载失败 */
    background: rgba(255, 136, 77, 0.1);
}

/* 文字信息区域 */
.notification-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
}

.notification-title {
    display: flex;
    align-items: center;
    gap: 5px;
}

.member-name {
    font-size: 14px;
    font-weight: 600;
    color: #ff884d;
    /* 主题橙色 */
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group-name {
    font-size: 13px;
    color: rgba(255, 204, 153, 0.85);
    font-weight: 500;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-text {
    font-size: 12px;
    color: rgba(255, 204, 153, 0.85);
    font-weight: 500;
}
</style>