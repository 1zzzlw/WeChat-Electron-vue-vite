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
        <img :src="avatar" alt="头像" class="notification-avatar" />
      </div>

      <!-- 文字信息 -->
      <div class="notification-info">
        <div class="notification-title">
          <span class="friend-name">{{ name }}</span>
          <span class="status-text">上线了</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

const props = defineProps({ avatar: String, name: String })
const emit = defineEmits(['close'])
</script>

<style scoped>
.notification {
  width: 320px;
  height: 100px;
  flex-shrink: 0;

  /* 纯毛玻璃效果，无背景色 */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  border-radius: 12px;
  border: 1px solid var(--notification-border, rgba(255, 255, 255, 0.15));
  box-shadow: var(--notification-shadow, 0 8px 32px rgba(0, 0, 0, 0.15));

  overflow: hidden;
  -webkit-app-region: no-drag;
}

.notification {
  transition: all 0.2s ease;
  cursor: pointer;
}

.notification:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-color, inherit);
  font-size: 14px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
  z-index: 2;
}

.close-btn:hover {
  background: var(--icon-hover-bg, rgba(255, 255, 255, 0.1));
}

/* 内容区域 - 垂直居中布局 */
.notification-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 16px 0 14px;
  gap: 12px;
  box-sizing: border-box;
}

/* 头像区域 */
.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.notification-avatar {
  width: 60px;
  height: 60px;
  border-radius: 15px;
  object-fit: cover;
  border: 2px solid var(--avatar-border, rgba(255, 255, 255, 0.2));
}

/* 文字信息 */
.notification-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.friend-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, inherit);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-text {
  font-size: 12px;
  color: var(--text-accent, inherit);
  font-weight: 500;
}
</style>