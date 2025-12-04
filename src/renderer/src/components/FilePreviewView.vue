<template>
  <div class="file-preview-view">
    <div class="content">
      <div v-for="(fileInfo, index) in fileInfoList" :key="index">
        <div class="file-item" v-if="fileInfo.fileType === 2">
          <el-icon class="close-icon"><Close /></el-icon>
          <img
            class="file-image"
            style="width: 100px; height: 100px"
            :src="fileInfo.fileUrl"
            alt=""
          />
        </div>
        <div v-else-if="fileInfo.fileType === 3">
          <el-icon class="close-icon"><Close /></el-icon>
          <video
            class="file-video"
            style="width: 100px; height: 100px"
            :src="fileInfo.fileUrl"
          ></video>
        </div>
        <div v-else-if="fileInfo.fileType === 4">
          <el-icon class="close-icon"><Close /></el-icon>
          <audio
            class="file-audio"
            style="width: 100px; height: 100px"
            :src="fileInfo.fileUrl"
          ></audio>
        </div>
        <div v-else>
          <div class="file">
            <el-icon class="close-icon"><Close /></el-icon>
            <img style="width: 80px; height: 80px" src="../assets/wenjian.svg" alt="" />
            <div class="file-content">
              <div class="file-name">名称：{{ fileInfo.fileName }}</div>
              <div class="file-size">大小：{{ fileInfo.fileSize }} KB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  fileInfoList: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.close-icon {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 20px;
  color: #fff;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.close-icon:hover {
  cursor: pointer;
  transform: scale(1.1);
  background-color: rgba(255, 255, 255, 0.2);
}

.file-preview-view {
  width: 100%;
  height: 120px;
  position: relative;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.content {
  width: 100%;
  height: 100%;
  padding: 0 20px 0 20px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 20px;
  scrollbar-width: thin;
}

/* 隐藏滚动条（可选） */
.content::-webkit-scrollbar {
  height: 4px;
}
.content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
}

.file-item {
  position: relative;
  overflow: hidden;
  object-fit: cover;
}

.file-image,
.file-video,
.file-audio {
  width: 100px;
  height: 100px;
}

.file {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}
</style>
