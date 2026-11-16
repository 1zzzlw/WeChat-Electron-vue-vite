<template>
  <div class="chat-file">
    <div class="file-icon" aria-hidden="true">
      <el-icon><Document /></el-icon>
    </div>
    <div class="file">
      <span class="file-name" :title="fileName">{{ fileName }}</span>
      <span class="file-size">{{ formatFileSize(fileSize) }}</span>
      <el-progress
        v-if="transferring && !transferFailed"
        class="file-progress"
        :class="{ 'is-paused': transferPaused }"
        :percentage="transferProgress"
        :show-text="false"
        :stroke-width="4"
        :aria-label="isUpload ? '文件上传进度' : '文件下载进度'"
      />
      <div class="file-footer">
        <div
          class="file-status"
          :class="{
            fail: transferFailed,
            complete: transferFinished && (!isUpload || sendStatus === 1) && !transferFailed
          }"
        >
          <template v-if="transferFailed"
            ><el-icon><CloseBold /></el-icon>{{ isUpload ? '发送失败' : '下载失败' }}</template
          >
          <template v-else-if="transferring">
            <span>{{
              transferPaused
                ? '已暂停'
                : isUpload && transferProgress === 100
                  ? '正在处理'
                  : `${isUpload ? '上传中' : '下载中'} ${transferProgress}%`
            }}</span>
            <span v-if="!transferPaused && transferProgress < 100" class="file-speed"
              >{{ transferSpeed }} MB/s</span
            >
          </template>
          <template v-else-if="transferFinished">
            <el-icon v-if="!isUpload || sendStatus === 1"><Select /></el-icon>
            <span>{{ isUpload ? (sendStatus === 1 ? '已发送' : '等待消息确认') : '已下载' }}</span>
          </template>
          <span v-else>{{ isUpload ? '准备上传' : '待下载' }}</span>
        </div>
        <el-button
          v-if="!isUpload && downloadStatus === 0 && nowDownloadStatus === statusMap.preview.value"
          class="file-action"
          size="small"
          @click="downloadFile"
          >下载</el-button
        >
        <el-button
          v-else-if="transferring && !transferFailed && transferProgress < 100"
          class="file-action"
          size="small"
          @click="
            isUpload
              ? pause
                ? startUpload()
                : pauseUpload()
              : downloadPause
                ? startDownload()
                : pauseDownload()
          "
        >
          {{ transferPaused ? '继续' : '暂停' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Document, Select, CloseBold } from '@element-plus/icons-vue';
import { useRoute } from 'vue-router'
import { FileUploadStatusInfo, FileDownloadStatusInfo } from '@/types/fileBaseInfo';
import { statusMap } from '@/utils/constants';
import { fileStatusListInfo } from '@/stores/modules/FileStatusInfoStore';

const props = defineProps<{
  sendStatus: number
  fileId: string
  fileName: string
  fileSize: number
  localPath: string
  remoteUrl: string
  downloadStatus: number
  receiveTime: string
  isUpload: boolean
}>()

function formatFileSize(fileSize: any) {
  // 处理边界值：0字节或非数字
  if (!fileSize || isNaN(fileSize)) return "0.00 KB";

  // 1MB = 1024KB = 1024*1024 Byte
  const KB = 1024;
  const MB = 1024 * KB;

  if (fileSize >= MB) {
    // 大于等于1MB，显示MB
    return `${(fileSize / MB).toFixed(2)} MB`;
  } else {
    // 小于1MB，显示KB
    return `${(fileSize / KB).toFixed(2)} KB`;
  }
}

const fileStatusListInfoStore = fileStatusListInfo()
const route = useRoute()

// const fileUploadStatusInfo = ref<FileUploadStatusInfo | undefined>()
// const fileDownloadStatusInfo = ref<FileDownloadStatusInfo | undefined>()

// const refreshFileStatus = () => {
//   fileUploadStatusInfo.value = fileStatusListInfoStore.getFileUploadUpdateInfo(props.fileId)
//   fileDownloadStatusInfo.value = fileStatusListInfoStore.getFileDownloadInfo(props.fileId)
// }

// const uploadProgress = computed(() => fileUploadStatusInfo.value?.uploadProgress || 0);
// const pause = computed(() => fileUploadStatusInfo.value?.pause || false);
// const uploadStatus = computed(() => fileUploadStatusInfo.value?.uploadStatus || statusMap.uploading.value);
// const uploadSpeed = computed(() => fileUploadStatusInfo.value?.uploadSpeed || 0)
// const nowDownloadStatus = computed(() => fileDownloadStatusInfo.value?.downloadStatus || statusMap.preview.value)
// const downloadProgress = computed(() => fileDownloadStatusInfo.value?.downloadProgress || 0);
// const downloadSpeed = computed(() => fileDownloadStatusInfo.value?.downloadSpeed || 0)

const uploadProgress = computed(() =>
  fileStatusListInfoStore.getFileUploadUpdateInfo(props.fileId)?.uploadProgress || 0
)
const pause = computed(() =>
  fileStatusListInfoStore.getFileUploadUpdateInfo(props.fileId)?.pause || false
)
const uploadStatus = computed(() =>
  fileStatusListInfoStore.getFileUploadUpdateInfo(props.fileId)?.uploadStatus || statusMap.uploading.value
)
const uploadSpeed = computed(() =>
  fileStatusListInfoStore.getFileUploadUpdateInfo(props.fileId)?.uploadSpeed || 0
)

const nowDownloadStatus = computed(() =>
  fileStatusListInfoStore.getFileDownloadInfo(props.fileId)?.downloadStatus || statusMap.preview.value
)
const downloadProgress = computed(() =>
  fileStatusListInfoStore.getFileDownloadInfo(props.fileId)?.downloadProgress || 0
)
const downloadSpeed = computed(() =>
  fileStatusListInfoStore.getFileDownloadInfo(props.fileId)?.downloadSpeed || 0
)
const downloadPause = computed(() =>
  fileStatusListInfoStore.getFileDownloadInfo(props.fileId)?.pause || false
)

const transferring = computed(() =>
  props.isUpload
    ? props.sendStatus === 0 && uploadStatus.value === statusMap.uploading.value
    : props.downloadStatus === 0 && nowDownloadStatus.value === statusMap.downloading.value
)
const transferProgress = computed(() =>
  Math.min(
    100,
    Math.max(0, Math.round(props.isUpload ? uploadProgress.value : downloadProgress.value))
  )
)
const transferPaused = computed(() => (props.isUpload ? pause.value : downloadPause.value))
const transferSpeed = computed(() =>
  (props.isUpload ? uploadSpeed.value : downloadSpeed.value).toFixed(2)
)
const transferFailed = computed(() =>
  props.isUpload
    ? props.sendStatus === 2 || uploadStatus.value === statusMap.fail.value
    : props.downloadStatus === 2 || nowDownloadStatus.value === statusMap.fail.value
)
const transferFinished = computed(() =>
  props.isUpload
    ? props.sendStatus === 1 || uploadStatus.value === statusMap.upload_finish.value
    : props.downloadStatus === 1 || nowDownloadStatus.value === statusMap.download_finish.value
)

const downloadFile = () => {
  const fileId = props.fileId
  fileStatusListInfoStore.addFileDownloadInfo(fileId, {
    fileId: fileId,
    downloadStatus: statusMap.downloading.value,
    downloadProgress: 0,
    downloadSpeed: 0,
    pause: false
  });
  // refreshFileStatus();
  (window as any).uploadFileApi.startDownloadFile(fileId, props.fileName, props.remoteUrl)
}

const pauseDownload = () => {
  fileStatusListInfoStore.updateFileDownloadPauseStatus(props.fileId, true)
  ;(window as any).uploadFileApi.updateFileDownloadPauseStatus(props.fileId, true)
}

const startDownload = () => {
  fileStatusListInfoStore.updateFileDownloadPauseStatus(props.fileId, false)
  ;(window as any).uploadFileApi.updateFileDownloadPauseStatus(props.fileId, false, props.fileName, props.remoteUrl)
}

const pauseUpload = () => {
  // 修改状态
  fileStatusListInfoStore.updateFileUploadPauseStatus(props.fileId, true)
  // 向主进程发送停止上传的通知
  const file = {
    fileId: props.fileId
  };
  (window as any).uploadFileApi.updateFileUploadPauseStatus(file, true)
}

const startUpload = () => {
  // 修改状态
  fileStatusListInfoStore.updateFileUploadPauseStatus(props.fileId, false)
  // 向主进程发送开始上传的通知
  const file = {
    fileId: props.fileId,
    fileName: props.fileName,
    fileSize: props.fileSize,
    fileType: 5,
    localPath: props.localPath
  };
  (window as any).uploadFileApi.updateFileUploadPauseStatus(file, false)
}

// 在文件组件的 onMounted 中
onMounted(() => {
  // refreshFileStatus()
})

// 监听路由变化，强制刷新状态
watch(
  () => route.query.conversationId,
  () => {
    // 路由切换时重新获取文件状态
    nextTick(() => {
      // refreshFileStatus()
    })
  }
)
</script>

<style scoped>
.chat-file {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 320px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
}
.file-icon {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  height: 52px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-deep);
  color: var(--color-text-secondary);
}
.file-icon .el-icon {
  font-size: 28px;
}
.file {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 5px;
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-strong);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
}
.file-size,
.file-speed {
  color: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.file-progress {
  margin-top: 5px;
}
.file-progress :deep(.el-progress-bar__outer) {
  background: var(--color-surface-3);
}
.file-progress :deep(.el-progress-bar__inner) {
  background: var(--color-accent);
}
.file-progress.is-paused :deep(.el-progress-bar__inner) {
  background: var(--color-text-muted);
}
.file-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
  margin-top: 3px;
}
.file-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 18px;
}
.file-status.complete {
  color: var(--color-success);
}
.file-status.fail {
  color: var(--color-danger);
}
.file-action.el-button {
  flex-shrink: 0;
  width: auto;
  height: 24px;
  margin: 0;
  padding: 0 9px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
}
.file-action.el-button:hover,
.file-action.el-button:focus-visible {
  border-color: var(--color-border-hover);
  background: var(--color-surface-2);
  color: var(--color-text-strong);
}
</style>
