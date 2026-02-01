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
      <div v-if="sendStatus === 0 && uploadStatus === statusMap.uploading.value">
        <div class="file-process">
          <!-- :status="uploadStatus" -->
          <el-progress :percentage="uploadProgress > 100 ? 100 : uploadProgress" />
        </div>
        <div class="upload-speed">
          <span>上传进度 {{ uploadSpeed }} MB/s</span>
          <el-button v-if="!pause" class="pause-button" @click="pauseUpload">暂停</el-button>
          <el-button v-else class="pause-button" @click="startUpload">开始</el-button>
        </div>
      </div>
      <div class="file-status complete" v-else-if="sendStatus === 1 || uploadStatus === statusMap.upload_finish.value">
        <span>上传完成</span>
      </div>
      <div class="file-status fail" v-else-if="sendStatus === 2 || uploadStatus === statusMap.fail.value">
        <span>上传失败</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { FileStatusInfo, statusMap } from '../types/fileBaseInfo';
import { fileStatusListInfo } from '../stores/FileStatusInfoStore';

const props = defineProps<{
  sendStatus: number
  fileId: string
  fileName: string
  fileSize: number
  localPath: string
  remoteUrl: string
  downloadStatus: number
  receiveTime: string
}>()

const fileStatusListInfoStore = fileStatusListInfo()

const fileStatusInfo = computed<FileStatusInfo | undefined>(() => {
  const fileId = props.fileId;
  // 调用Pinia仓库方法，返回对应文件状态
  return fileStatusListInfoStore.getFileUpdateInfo(fileId);
});

const uploadProgress = computed(() => fileStatusInfo.value?.uploadProgress || 0);
const pause = computed(() => fileStatusInfo.value?.pause || false);
const uploadStatus = computed(() => fileStatusInfo.value?.uploadStatus || statusMap.uploading.value);
const uploadSpeed = computed(() => fileStatusInfo.value?.uploadSpeed || 0)

const pauseUpload = () => {
  // 修改状态

  // 向主进程发送停止上传的通知


}

const startUpload = () => {
  // 修改状态


  // 向主进程发送开始上传的通知


}
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

.upload-speed {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: space-between;
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

.pause-button {
  height: 25px;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.pause-button:hover {
  background: rgba(74, 144, 226, 0.25);
  border-color: rgba(74, 144, 226, 0.4);
  color: #4a90e2;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(74, 144, 226, 0.15);
}

.pause-button:active {
  background: rgba(74, 144, 226, 0.35);
  border-color: rgba(74, 144, 226, 0.5);
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(74, 144, 226, 0.1);
}

/* 上传完成样式 */
.file-status.complete {
  color: #4ade80;
  font-size: 13px;
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 上传失败样式 */
.file-status.fail {
  color: #f87171;
  font-size: 13px;
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
