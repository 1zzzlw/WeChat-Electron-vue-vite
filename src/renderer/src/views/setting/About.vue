<template>
  <div class="about-container">
    <!-- 应用信息区域 -->
    <div class="app-info">
      <div class="logo-section">
        <div class="app-logo">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
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
      <div class="info-row">
        <span class="label">操作系统</span>
        <span class="value">{{ osInfo }}</span>
      </div>
      <div class="info-row">
        <span class="label">架构</span>
        <span class="value">{{ arch }}</span>
      </div>
      <div class="info-row">
        <span class="label">内存</span>
        <span class="value">{{ memoryInfo }}</span>
      </div>
    </div>

    <!-- 相关链接 -->
    <div class="links-section">
      <button class="link-btn" @click="openGitHub">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85v2.74c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
        </svg>
        GitHub
      </button>
      <button class="link-btn" @click="openWebsite">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
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
import { ref, onMounted } from 'vue'

const appVersion = ref('v1.0.0')
const electronVersion = ref('')
const buildTime = ref('2025-10-01')
const osInfo = ref('')
const arch = ref('')
const memoryInfo = ref('')
const checking = ref(false)

onMounted(async () => {
  // 获取应用信息
  // const appInfo = await ipcRenderer.invoke('get-app-info')
  // appVersion.value = appInfo.version
  // electronVersion.value = appInfo.electronVersion
  // buildTime.value = appInfo.buildTime

  // // 获取系统信息
  // osInfo.value = appInfo.platform
  // arch.value = appInfo.arch
  // memoryInfo.value = `${(appInfo.totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB`
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
  // ipcRenderer.invoke('open-external', 'https://github.com/your-repo')
}

const openWebsite = () => {
  // ipcRenderer.invoke('open-external', 'https://your-website.com')
}
</script>

<style scoped>
.about-container {
  width: 100%;
  height: 100%;
  padding: 15px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
}

.app-info {
  text-align: center;
  margin-bottom: 10px;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.logo-section {
  margin-bottom: 10px;
}

.app-logo {
  width: 60px;
  height: 60px;
  margin: 0 auto 8px;
  color: var(--primary-color);
}

.app-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 3px;
  color: var(--text-primary);
}

.app-tagline {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
}

.version-section {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
  padding: 10px;
  background: var(--bg-primary);
  border-radius: 6px;
}


.version-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.version-item .label {
  font-size: 10px;
  color: var(--text-secondary);
}

.version-item .value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.update-btn {
  padding: 5px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.update-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.tech-stack,
.system-info {
  margin-bottom: 8px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.tech-stack h3,
.system-info h3 {
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tech-tag {
  padding: 3px 8px;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  color: var(--text-secondary);
  font-size: 11px;
}

.info-row .value {
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 500;
}

.links-section {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.link-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.link-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.copyright {
  text-align: center;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.copyright p {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>