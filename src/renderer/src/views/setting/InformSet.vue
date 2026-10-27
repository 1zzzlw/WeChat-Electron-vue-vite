<template>
  <div class="notification-container">
    <div class="settings-section">
      <h3>消息提醒</h3>
      <div class="setting-item">
        <div><div class="setting-label">启用消息提醒</div><p>控制提示音和托盘闪烁，消息接收与未读数不受影响</p></div>
        <el-switch v-model="settings.enableNotification" :disabled="!ready" aria-label="启用消息提醒" />
      </div>
    </div>
    <fieldset :disabled="!ready || !settings.enableNotification">
      <div class="settings-section">
        <h3>提醒方式</h3>
        <div class="setting-item">
          <div><div class="setting-label">消息提示音</div><p>收到符合提醒条件的新消息时播放</p></div>
          <div class="sound-controls">
            <button class="preview-button" type="button" @click="previewSound">试听</button>
            <el-switch v-model="settings.playSound" :disabled="!ready || !settings.enableNotification" aria-label="消息提示音" />
          </div>
        </div>
        <div class="setting-item">
          <div><div class="setting-label">托盘图标闪烁</div><p>会话未在前台查看时，闪烁系统托盘图标</p></div>
          <el-switch v-model="settings.flashTaskbar" :disabled="!ready || !settings.enableNotification" aria-label="托盘图标闪烁" />
        </div>
      </div>
      <div class="settings-section">
        <h3>提醒范围</h3>
        <div class="setting-item">
          <div><div class="setting-label">私聊消息</div><p>允许私聊触发提示音和托盘提醒</p></div>
          <el-switch v-model="settings.notifyPrivateChat" :disabled="!ready || !settings.enableNotification" aria-label="私聊消息提醒" />
        </div>
        <div class="setting-item">
          <div><div class="setting-label">群聊消息</div><p>允许群聊触发提示音和托盘提醒</p></div>
          <el-switch v-model="settings.notifyGroupChat" :disabled="!ready || !settings.enableNotification" aria-label="群聊消息提醒" />
        </div>
        <p class="hint">已设为免打扰的会话保持静音。</p>
      </div>
      <div class="settings-section">
        <h3>定时免打扰</h3>
        <div class="setting-item">
          <div><div class="setting-label">启用免打扰时段</div><p>时段内暂停声音和托盘提醒，消息正常接收</p></div>
          <el-switch v-model="settings.doNotDisturb" :disabled="!ready || !settings.enableNotification" aria-label="定时免打扰" />
        </div>
        <div v-if="settings.doNotDisturb" class="setting-item">
          <div><div class="setting-label">免打扰时段</div><p>支持跨午夜；起止相同时为全天免打扰</p></div>
          <div class="time-range">
            <input v-model="settings.dndStartTime" type="time" required aria-label="免打扰开始时间" />
            <span>至</span>
            <input v-model="settings.dndEndTime" type="time" required aria-label="免打扰结束时间" />
          </div>
        </div>
      </div>
    </fieldset>
    <p class="save-status" role="status">{{ saveStatus }}</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 仅保存主进程消息链路实际支持的选项；旧版本的占位选项不再载入。
const settings = reactive({
  enableNotification: true,
  playSound: true,
  notifyPrivateChat: true,
  notifyGroupChat: true,
  flashTaskbar: true,
  doNotDisturb: false,
  dndStartTime: '23:00',
  dndEndTime: '08:00'
})
const ready = ref(false)
const saveStatus = ref('正在加载设置…')
let sound: HTMLAudioElement | null = null

const validTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

onMounted(async () => {
  try {
    const raw = await (window as any).userInfoApi.storeGetUserInfo('notificationSettings')
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (saved && typeof saved === 'object') {
      for (const key of Object.keys(settings) as Array<keyof typeof settings>) {
        if (key === 'dndStartTime' || key === 'dndEndTime') {
          if (validTime(saved[key])) settings[key] = saved[key]
        } else if (typeof saved[key] === 'boolean') {
          settings[key] = saved[key]
        }
      }
    }
    saveStatus.value = '设置自动保存，仅影响本机提醒'
  } catch {
    saveStatus.value = '设置加载失败，请重新打开此页面'
    ElMessage.error('通知设置加载失败')
    return
  }
  ready.value = true
})

// 开关立即保存，离开页面时不会丢失尚未执行的定时保存任务。
watch(settings, async () => {
  if (!ready.value) return
  if (!validTime(settings.dndStartTime) || !validTime(settings.dndEndTime)) {
    saveStatus.value = '请补全免打扰时段'
    return
  }
  try {
    await (window as any).userInfoApi.storeSetUserInfo('notificationSettings', JSON.stringify(settings))
    saveStatus.value = '已保存，仅影响本机提醒'
  } catch {
    saveStatus.value = '保存失败，请重新设置'
    ElMessage.error('通知设置保存失败')
  }
}, { deep: true, flush: 'sync' })

const previewSound = async () => {
  sound ??= new Audio(new URL('./audios/sfx/message-sound.mp3', document.baseURI).href)
  sound.volume = 0.8
  sound.pause()
  sound.currentTime = 0
  try {
    await sound.play()
  } catch {
    ElMessage.error('提示音播放失败，请检查音频文件和系统音量')
  }
}

onUnmounted(() => sound?.pause())
</script>

<style scoped>
.notification-container { height: 100%; overflow-y: auto; padding: 24px; box-sizing: border-box; -webkit-app-region: no-drag; color: var(--color-text-primary); }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; transition: opacity .2s; }
fieldset:disabled { opacity: .5; }
.settings-section { padding: 20px 0; border-bottom: 1px solid var(--color-border-subtle); }
.settings-section:first-child { padding-top: 0; }
h3 { font-size: 16px; margin: 0 0 8px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 18px 0; }
.setting-label { font-size: 14px; font-weight: 500; }
p { color: var(--color-text-muted); font-size: 12px; line-height: 1.6; margin: 6px 0 0; }
.sound-controls, .time-range { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.preview-button, input { color: var(--color-text-primary); background: rgba(var(--color-surface-rgb), .8); border: 1px solid var(--color-border-subtle); border-radius: 8px; padding: 7px 10px; }
.preview-button { cursor: pointer; transition: background .2s; }
.preview-button:hover { background: rgba(var(--color-accent-rgb), .2); }
.preview-button:disabled { cursor: default; }
.time-range { font-size: 12px; gap: 8px; }
input { width: 90px; font: inherit; color-scheme: light dark; }
.hint, .save-status { margin: 10px 0; }
.notification-container::-webkit-scrollbar { width: 5px; }
.notification-container::-webkit-scrollbar-thumb { background: rgba(var(--color-accent-rgb), .3); border-radius: 5px; }
</style>
