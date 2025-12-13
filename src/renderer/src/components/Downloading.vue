<template>
  <div class="downloading-list">
    <el-scrollbar>
      <div class="download-item" v-for="(item, index) in downloadFileList" :key="index">
        <div class="file-icon">
          <img style="width: 80px; height: 80px" src="../assets/wenjian.svg" alt="" />
        </div>
        <div class="download-progress">
          <span>{{ item.fileName }} {{ item.fileSize }}</span>
          <div class="progress-bar">
            <div
              class="progress"
              :style="{
                '--progress-percent': item.progress > 100 ? 100 : item.progress,
                '--progress-value': (item.progress > 100 ? 100 : item.progress) + '%'
              }"
            ></div>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script lang="ts" setup>
interface uploadFileInfo {
  fileId: string
  fileName: string
  fileSize: number
  uploadedSize: number
  progress: number
}

defineProps<{
  downloadFileList: uploadFileInfo[]
}>()
</script>

<style scoped>
.downloading-list {
  width: 100%;
  height: 100%;
  border: 1px solid skyblue;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.download-item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress {
  --progress-percent: 0%;
  --progress-value: 0%;
  width: 250px;
  height: 10px;
  border: 1px solid black;
  counter-reset: progress-counter var(--progress-percent);
  position: relative;
}

.progress::after {
  content: counter(progress-counter) '%';
  font-size: 14px;
  color: #333;
  display: inline-block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.progress::before {
  content: '';
  display: block;
  width: var(--progress-value);
  height: 10px;
  background-color: greenyellow;
}
</style>
