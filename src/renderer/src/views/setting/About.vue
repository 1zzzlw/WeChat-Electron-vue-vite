<template>
  <div class="about-container">
    <!-- 应用信息区域 -->
    <div class="app-info">
      <div class="logo-section">
        <div class="app-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
              fill="currentColor" />
          </svg>
        </div>
        <h1 class="app-name">QuickTalk</h1>
        <p class="app-tagline">即时通讯，触手可及</p>
      </div>

      <!-- 版本信息 -->
      <div class="version-section">
        <div class="version-item">
          <span class="label">版本号</span>
          <span class="value">{{ appVersion }}</span>
        </div>
        <div class="version-item">
          <span class="label">Electron</span>
          <span class="value">{{ electronVersion }}</span>
        </div>
        <div class="version-item">
          <span class="label">构建时间</span>
          <span class="value">{{ buildTime }}</span>
        </div>
      </div>

      <!-- 检查更新 -->
      <button class="update-btn" @click="checkForUpdates">
        <span v-if="!checking">检查更新</span>
        <span v-else>检查中...</span>
      </button>
    </div>

    <!-- 技术栈 -->
    <div class="tech-stack">
      <h3>技术架构</h3>
      <div class="tech-tags">
        <span class="tech-tag">Electron</span>
        <span class="tech-tag">Vue 3</span>
        <span class="tech-tag">TypeScript</span>
        <span class="tech-tag">Netty</span>
        <span class="tech-tag">Spring Boot</span>
        <span class="tech-tag">Redis</span>
        <span class="tech-tag">RabbitMQ</span>
        <span class="tech-tag">Minio</span>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="system-info">
      <h3>系统信息</h3>
      <!-- 操作系统信息 -->
      <div class="info-group os-group">
        <div class="info-label">操作系统</div>
        <div class="info-content os-details">
          <div class="os-row">
            <div class="os-item">
              <span class="detail-label">CPU 架构：</span>
              <span class="detail-value">{{ systemInfo.operatingSystemInfo.cpuArchitecture || '未知' }}</span>
            </div>
            <div class="os-item">
              <span class="detail-label">系统类型：</span>
              <span class="detail-value">{{ systemInfo.operatingSystemInfo.osType || '未知' }}</span>
            </div>
          </div>
          <div class="os-row">
            <div class="os-item">
              <span class="detail-label">系统平台：</span>
              <span class="detail-value">{{ systemInfo.operatingSystemInfo.platform || '未知' }}</span>
            </div>
            <div class="os-item">
              <span class="detail-label">系统版本：</span>
              <span class="detail-value">{{ systemInfo.operatingSystemInfo.osVersion || '未知' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CPU信息（替代原空的"架构"） -->
      <div class="info-group">
        <div class="info-label">CPU 信息</div>
        <div class="info-content">
          <div class="os-row">
            <div class="os-item">
              <span class="detail-label">核心数：</span>
              <span class="detail-value">{{ systemInfo.cpuInformation.cpuCores || '未知' }} 核</span>
            </div>
            <div class="os-item">
              <span class="detail-label">型号：</span>
              <span class="detail-value">{{ systemInfo.cpuInformation.cpuModel || '未知' }}</span>
            </div>
          </div>
          <div class="os-row">
            <div class="os-item">
              <span class="detail-label">主频：</span>
              <span class="detail-value">{{ systemInfo.cpuInformation.cpuSpeed || '未知' }}</span>
            </div>
            <div class="os-item">
              <span class="detail-label">主机名：</span>
              <span class="detail-value">{{ systemInfo.hostInformation.hostname || '未知' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 内存信息（精简进度条） -->
      <div class="info-group memory-group">
        <div class="info-label">内存使用</div>
        <div class="memory-content">
          <!-- 内存文本信息 -->
          <div class="memory-text">
            <span class="memory-used">{{ systemInfo.memoryInformation.memoryUsage || '0%' }}</span>
            <span class="memory-total">总：{{ systemInfo.memoryInformation.totalMemory || '0 GB' }}</span>
          </div>

          <!-- 精简版内存进度条 -->
          <div class="memory-progress-container">
            <div class="memory-progress-bar" :style="{ width: memoryUsagePercent + '%' }"></div>
          </div>

          <!-- 精简内存详情 -->
          <div class="memory-details">
            <span>空闲：{{ systemInfo.memoryInformation.freeMemory || '0 GB' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 相关链接 -->
    <div class="links-section">
      <button class="link-btn" @click="openGitHub">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85v2.74c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
        </svg>
        GitHub
      </button>
      <button class="link-btn" @click="openWebsite">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
        官网
      </button>
    </div>

    <!-- 版权信息 -->
    <div class="copyright">
      <p>© 2024 QuickTalk IM · Developed by 林威</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const appVersion = ref('v1.0.0')
const electronVersion = ref('38.1.2')
const buildTime = ref('2025-10-01')
// 改为直接存储完整的系统信息对象，而非拼接字符串
const systemInfo = ref<any>({
  operatingSystemInfo: {},
  cpuInformation: {},
  memoryInformation: {},
  hostInformation: {}
})
const checking = ref(false)

// 计算内存使用率百分比（直接从对象取值，更可靠）
const memoryUsagePercent = computed(() => {
  const usageStr = systemInfo.value.memoryInformation.memoryUsage || '0%'
  return parseFloat(usageStr) || 0
})

onMounted(async () => {
  try {
    // 获取应用信息
    const appInfo = await (window as any).windowToolApi.getWindowInfo()
    // 直接赋值完整对象，不再拼接字符串
    systemInfo.value = appInfo

    // 可选：如果需要展示Electron版本
    if ((window as any).process?.versions?.electron) {
      electronVersion.value = (window as any).process.versions.electron
    }

    console.log('系统信息:', appInfo)
  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
})

const checkForUpdates = async () => {
  checking.value = true
  try {
    // await ipcRenderer.invoke('check-for-updates')
  } catch (error) {
    console.error('检查更新失败:', error)
  } finally {
    checking.value = false
  }
}

const openGitHub = () => {
  window.open('https://github.com/1zzzlw/WeChat-Electron-vue-vite', '_blank');
}

const openWebsite = () => {
  window.open('https://github.com/1zzzlw/IM-SpringCloud-Upgrade', '_blank');
}
</script>

<style scoped>
.about-container {
  width: 100%;
  height: 100%;
  padding: 12px 15px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
  color: #222;
  font-size: 11px;
}

.app-info {
  text-align: center;
  margin-bottom: 10px;
  padding: 8px 0;
}

.logo-section {
  margin-bottom: 8px;
}

.app-logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 5px;
  color: #222;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 2px;
  color: #222;
}

.app-tagline {
  font-size: 10px;
  color: #444;
  margin: 0;
}

.version-section {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 8px;
  padding: 6px 0;
}

.version-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.version-item .label {
  font-size: 9px;
  color: #444;
}

.version-item .value {
  font-size: 11px;
  font-weight: 500;
  color: #222;
}

.update-btn {
  padding: 4px 15px;
  background: transparent;
  color: #222;
  border: none;
  border-radius: 0;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.update-btn:hover {
  background: transparent;
  color: #000;
}

.tech-stack,
.system-info {
  margin-bottom: 10px;
  padding: 5px 0;
}

.tech-stack h3,
.system-info h3 {
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 6px;
  color: #222;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  padding: 2px 7px;
  background: transparent;
  color: #222;
  border-radius: 0;
  font-size: 9px;
  border: none;
  cursor: default;
}

.info-group {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.info-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.info-label {
  font-size: 11px;
  color: #444;
  margin-bottom: 4px;
  font-weight: 500;
}

.info-content {
  font-size: 10px;
  color: #222;
  line-height: 1.4;
}

.os-group {
  margin-bottom: 6px;
  padding-bottom: 6px;
}

.os-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.os-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 3px;
}

.os-item {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1;
}

.detail-label {
  color: #444;
  font-size: 9px;
}

.detail-value {
  color: #222;
  font-size: 10px;
}

.memory-group {
  padding-top: 2px;
}

.memory-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.memory-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.memory-used {
  font-size: 10px;
  font-weight: 600;
  color: #222;
}

.memory-total {
  font-size: 9px;
  color: #444;
}

.memory-progress-container {
  width: 100%;
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  overflow: hidden;
}

.memory-progress-bar {
  height: 100%;
  background: #222;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.memory-details {
  font-size: 9px;
  color: #444;
}

.links-section {
  display: flex;
  gap: 15px;
  margin-bottom: 8px;
  justify-content: center;
}

.link-btn {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  color: #222;
  border: none;
  border-radius: 0;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.link-btn:hover {
  background: transparent;
  color: #000;
}

.copyright {
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid #ddd;
  margin-top: auto;
}

.copyright p {
  margin: 0;
  font-size: 9px;
  color: #151515;
}
</style>