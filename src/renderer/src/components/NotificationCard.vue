<template>
  <div class="notification" :class="`variant-${variant}`">
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
          <span class="display-name">{{ name }}</span>
          <el-icon v-if="showGender && gender === 1" class="gender-icon male">
            <Male />
          </el-icon>
          <el-icon v-else-if="showGender && gender === 0" class="gender-icon female">
            <Female />
          </el-icon>
          <span v-if="groupName" class="group-name">&middot; {{ groupName }}</span>
        </div>
        <div class="status-text">{{ description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Close, Male, Female } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  avatar?: string
  name?: string
  description?: string
  variant?: 'info' | 'warning' | 'danger'
  showGender?: boolean
  gender?: number
  groupName?: string
}>(), {
  variant: 'info',
  showGender: false,
  description: ''
})

const emit = defineEmits(['close'])
</script>

<style scoped>
/* ===== Base styles (shared across all variants) ===== */
.notification {
  width: 320px;
  height: 100px;
  flex-shrink: 0;
  position: relative;

  /* 毛玻璃效果 */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  border-radius: 12px;
  overflow: hidden;
  -webkit-app-region: no-drag;

  transition: all 0.2s ease;
  cursor: pointer;
}

.notification:hover {
  transform: scale(1.02);
}

/* ===== Variant: info (cyan/blue theme) ===== */
.notification.variant-info {
  border: 1px solid var(--notification-border, rgba(255, 255, 255, 0.15));
  box-shadow: var(--notification-shadow, 0 8px 32px rgba(0, 0, 0, 0.15));
}

.notification.variant-info:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.25);
}

.notification.variant-info .notification-avatar {
  border: 2px solid var(--avatar-border, rgba(255, 255, 255, 0.2));
}

.notification.variant-info .display-name {
  color: var(--text-primary, inherit);
}

.notification.variant-info .status-text {
  color: var(--text-accent, inherit);
  font-weight: 500;
}

/* ===== Variant: warning (orange theme - FriendDelete, GroupExit) ===== */
.notification.variant-warning {
  border: 1px solid rgba(255, 136, 77, 0.3);
  box-shadow: 0 8px 32px rgba(255, 81, 0, 0.15);
}

.notification.variant-warning:hover {
  box-shadow: 0 12px 40px rgba(255, 81, 0, 0.25);
  border-color: rgba(255, 136, 77, 0.4);
}

.notification.variant-warning .close-btn {
  color: #ff884d;
}

.notification.variant-warning .notification-avatar {
  border: 2px solid rgba(255, 136, 77, 0.2);
  background: rgba(255, 136, 77, 0.1);
}

.notification.variant-warning .display-name {
  color: #ff884d;
}

.notification.variant-warning .group-name {
  color: rgba(255, 204, 153, 0.85);
}

.notification.variant-warning .status-text {
  color: rgba(255, 204, 153, 0.85);
  font-weight: 500;
}

/* ===== Variant: danger (red theme - GroupDissolve) ===== */
.notification.variant-danger {
  border: 1px solid rgba(255, 65, 65, 0.3);
  box-shadow: 0 8px 32px rgba(255, 0, 0, 0.12);
}

.notification.variant-danger:hover {
  box-shadow: 0 12px 40px rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 65, 65, 0.45);
}

.notification.variant-danger .close-btn {
  color: #ff4141;
}

.notification.variant-danger .notification-avatar {
  border: 2px solid rgba(255, 65, 65, 0.2);
  background: rgba(255, 65, 65, 0.1);
}

.notification.variant-danger .display-name {
  color: #ff4141;
}

.notification.variant-danger .status-text {
  color: rgba(255, 153, 153, 0.9);
  font-weight: 500;
}

/* ===== Close button ===== */
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
  background: rgba(255, 255, 255, 0.1);
}

/* ===== Content layout ===== */
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
}

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
  gap: 6px;
}

.display-name {
  font-size: 14px;
  font-weight: 600;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gender-icon {
  font-size: 16px;
  vertical-align: middle;
  filter: drop-shadow(0 0 2px currentColor);
}

.gender-icon.male {
  color: #409eff;
}

.gender-icon.female {
  color: #ff8acc;
}

.group-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-text {
  font-size: 12px;
  font-weight: 400;
}
</style>
