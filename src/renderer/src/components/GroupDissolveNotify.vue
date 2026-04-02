<template>
    <div class="notification">
        <!-- 关闭按钮 -->
        <el-icon class="close-btn" @click="emit('close')">
            <Close />
        </el-icon>

        <!-- 内容区域 -->
        <div class="notification-content">
            <!-- 群聊头像 -->
            <div class="avatar-wrapper">
                <img :src="groupAvatar" alt="群聊头像" class="notification-avatar" />
            </div>

            <!-- 文字信息 -->
            <div class="notification-info">
                <div class="notification-title">
                    <span class="group-name">{{ groupName }}</span>
                </div>
                <div class="status-text">该群已被解散</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
    // 群聊头像
    groupAvatar: String,
    // 群聊名称
    groupName: String
})

const emit = defineEmits(['close'])
</script>

<style scoped>
/* 红色主题：群聊解散 */
.notification {
    width: 320px;
    height: 100px;
    flex-shrink: 0;
    position: relative;

    /* 毛玻璃效果保留 */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    /* 红色系边框 + 阴影 */
    border-radius: 12px;
    border: 1px solid rgba(255, 65, 65, 0.3);
    box-shadow: 0 8px 32px rgba(255, 0, 0, 0.12);

    overflow: hidden;
    -webkit-app-region: no-drag;
}

/* 悬浮交互：红色强化 */
.notification {
    transition: all 0.2s ease;
    cursor: pointer;
}

.notification:hover {
    transform: scale(1.02);
    box-shadow: 0 12px 40px rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 65, 65, 0.45);
}

/* 关闭按钮：红色主题 */
.close-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff4141;
    font-size: 14px;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s ease;
    z-index: 2;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* 内容布局（完全对齐原卡片） */
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

/* 群聊头像：红色边框风格 */
.notification-avatar {
    width: 60px;
    height: 60px;
    border-radius: 15px;
    object-fit: cover;
    border: 2px solid rgba(255, 65, 65, 0.2);
    background: rgba(255, 65, 65, 0.1);
}

/* 文字信息 */
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

/* 群名：红色高亮 */
.group-name {
    font-size: 14px;
    font-weight: 600;
    color: #ff4141;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 状态文字：淡红色 */
.status-text {
    font-size: 12px;
    color: rgba(255, 153, 153, 0.9);
    font-weight: 500;
}
</style>