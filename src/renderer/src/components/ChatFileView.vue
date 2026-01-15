<template>
  <div class="chat-file file-downloading">
    <div v-if="downloadStatus === 0">

    </div>
    <img class="file-icon" src="../assets/wenjian.svg" alt="" />
    <div class="file">
      <div class="file-content">
        <span class="file-name">{{ fileName }}</span>
        <span class="file-size">{{ (fileSize / 1024 / 1024).toFixed(2) }} MB</span>
      </div>
      <div class="file-process">
        <el-progress :percentage="process > 100 ? 100 : process" :status="isSuccess" />
      </div>
      <div class="file-speed">
        <span>下载速度</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  sendStatus: number
  fileName: string
  fileSize: number
  localPath: string
  remoteUrl: string
  downloadStatus: number
  receiveTime: string
}>()

const process = ref(0)
const isSuccess = ref()

onMounted(() => {
  setInterval(() => {
    process.value++
    if (process.value === 100) {
      console.info(process.value)
      isSuccess.value = 'success'
      return
    }
  }, 10)
})
</script>

<style scoped>
.chat-file {
  display: flex;
  gap: 20px;
  border-radius: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.2s ease;
  position: relative;
}

.chat-file:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* 文件图标区域 */
.file-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.file-icon img {
  width: 40px;
  height: 40px;
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

.file-icon:hover {
  background: rgba(255, 255, 255, 0.15);
}

.file-icon:hover img {
  opacity: 1;
}


.file {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.5;
}

.file-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.file-name {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.file-process {
  margin-top: 4px;
  position: relative;
}

.el-progress {
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  position: relative;
}

:deep(.el-progress__text) {
  color: #ffffff;
  font-size: 8px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

:deep(.el-progress-bar__outer) {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  height: 8px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #4a90e2 0%, #5c9ef0 100%);
  border-radius: 4px;
  height: 8px;
  box-shadow: 0 1px 2px rgba(74, 144, 226, 0.3);
  transition: width 0.3s ease;
  position: relative;
}

/* 添加进度条动画效果 */
:deep(.el-progress-bar__inner::before) {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  animation: progress-shine 1.5s infinite;
}

@keyframes progress-shine {
  to {
    left: 100%;
  }
}

.file-speed {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 为不同状态添加样式 */
.file-downloading {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.3);
  }

  70% {
    box-shadow: 0 0 0 8px rgba(74, 144, 226, 0.05);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(74, 144, 226, 0);
  }
}
</style>
