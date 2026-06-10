<template>
  <div class="notification-container">
    <div class="settings-section">
      <h3 class="section-title">消息通知</h3>

      <!-- 启用通知 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">启用通知</div>
          <div class="setting-desc">接收新消息通知</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.enableNotification" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 桌面通知 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">桌面通知</div>
          <div class="setting-desc">收到消息时显示桌面通知</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.desktopNotification" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 通知显示内容 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">通知显示内容</div>
          <div class="setting-desc">通知中显示消息详情</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.showNotificationDetail" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">声音设置</h3>

      <!-- 播放提示音 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">播放提示音</div>
          <div class="setting-desc">收到消息时播放提示音</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.playSound" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 提示音选择 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">提示音</div>
          <div class="setting-desc">选择通知声音</div>
        </div>
        <select class="select-input" v-model="settings.soundType">
          <option value="default">默认</option>
          <option value="gentle">轻柔</option>
          <option value="clear">清晰</option>
          <option value="none">无声</option>
        </select>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">免打扰</h3>

      <!-- 免打扰模式 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">免打扰模式</div>
          <div class="setting-desc">开启后不接收通知提醒</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.doNotDisturb" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 免打扰时间段 -->
      <div class="setting-item" v-if="settings.doNotDisturb">
        <div class="setting-info">
          <div class="setting-label">免打扰时段</div>
          <div class="setting-desc">设置免打扰时间范围</div>
        </div>
        <div class="time-range">
          <input type="time" v-model="settings.dndStartTime" class="time-input" />
          <span class="time-separator">至</span>
          <input type="time" v-model="settings.dndEndTime" class="time-input" />
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">通知范围</h3>

      <!-- 私聊消息 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">私聊消息</div>
          <div class="setting-desc">接收私聊消息通知</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.notifyPrivateChat" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 群聊消息 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">群聊消息</div>
          <div class="setting-desc">接收群聊消息通知</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.notifyGroupChat" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- @提醒 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">@我的消息</div>
          <div class="setting-desc">被@时始终通知</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.notifyMention" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">任务栏图标</h3>

      <!-- 闪烁任务栏 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">闪烁任务栏图标</div>
          <div class="setting-desc">收到消息时闪烁任务栏图标</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.flashTaskbar" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 显示未读数 -->
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">显示未读消息数</div>
          <div class="setting-desc">在任务栏图标显示未读数量</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.showUnreadCount" />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

const settings = reactive({
  enableNotification: true,
  desktopNotification: true,
  showNotificationDetail: true,
  playSound: true,
  soundType: 'default',
  doNotDisturb: false,
  dndStartTime: '23:00',
  dndEndTime: '08:00',
  notifyPrivateChat: true,
  notifyGroupChat: true,
  notifyMention: true,
  flashTaskbar: true,
  showUnreadCount: true
})

onMounted(async () => {
  try {
    const savedSettings = await (window as any).userInfoApi.storeGetUserInfo('notificationSettings')
    if (savedSettings) {
      const parsed = typeof savedSettings === 'string' ? JSON.parse(savedSettings) : savedSettings
      Object.assign(settings, parsed)
    }
  } catch (error) {
    console.error('加载通知设置失败:', error)
  }
})

let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(settings, async (newSettings) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await (window as any).userInfoApi.storeSetUserInfo('notificationSettings', JSON.stringify(newSettings))
      ElMessage.success('设置已保存')
    } catch (error) {
      console.error('保存通知设置失败:', error)
    }
  }, 500)
}, { deep: true })
</script>

<style scoped>
.notification-container {
  padding: 24px;
  max-width: 700px;
  overflow-y: auto;
  height: 100%;
  -webkit-app-region: no-drag;

}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(66, 153, 225, 0.2);
}

.settings-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px;
  color: #f0f0f0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  margin-right: 16px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #f0f0f0;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 12px;
  color: rgba(240, 240, 240, 0.5);
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(35, 45, 60, 0.7);
  transition: 0.3s;
  border-radius: 24px;
  border: 1px solid rgba(66, 153, 225, 0.2);
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: rgba(240, 240, 240, 0.5);
  transition: 0.3s;
  border-radius: 50%;
}

input:checked+.slider {
  background-color: rgba(66, 153, 225, 0.5);
  border-color: rgba(66, 153, 225, 0.6);
}

input:checked+.slider:before {
  transform: translateX(20px);
  background-color: white;
}

/* 下拉选择 */
.select-input {
  padding: 6px 12px;
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: #f0f0f0;
  cursor: pointer;
  outline: none;
  color-scheme: dark;
}

.select-input:hover {
  border-color: rgba(66, 153, 225, 0.6);
}

/* 时间范围选择 */
.time-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-input {
  padding: 6px 10px;
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid rgba(66, 153, 225, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: #f0f0f0;
  cursor: pointer;
  outline: none;
  color-scheme: dark;
}

.time-input:hover {
  border-color: rgba(66, 153, 225, 0.6);
}

.time-separator {
  font-size: 13px;
  color: rgba(240, 240, 240, 0.5);
}

/* 滚动条样式 */
.notification-container::-webkit-scrollbar {
  width: 6px;
}

.notification-container::-webkit-scrollbar-track {
  background: transparent;
}

.notification-container::-webkit-scrollbar-thumb {
  background: rgba(66, 153, 225, 0.3);
  border-radius: 3px;
}

.notification-container::-webkit-scrollbar-thumb:hover {
  background: rgba(66, 153, 225, 0.5);
}
</style>