<template>
  <div class="file-preview-view">
    <div class="content">
      <div class="content-main" v-for="fileInfo in fileList" :key="fileInfo.fileId">
        <div class="file-item" v-if="fileInfo.fileType === 2">
          <el-icon class="close-icon" @click="closePreview(fileInfo.fileId)">
            <Close />
          </el-icon>
          <img class="file-image" style="width: 100px; height: 100px" :src="fileInfo.base64" alt="" />
        </div>
        <div class="file-item" v-else-if="fileInfo.fileType === 3">
          <el-icon class="close-icon" @click="closePreview(fileInfo.fileId)">
            <Close />
          </el-icon>
          <img class="file-video" style="width: 100px; height: 100px" :src="fileInfo.base64"></img>
        </div>
        <div class=" file-item" v-else-if="fileInfo.fileType === 4">
          <el-icon class="close-icon" @click="closePreview(fileInfo.fileId)">
            <Close />
          </el-icon>
          <audio class="file-audio" style="width: 100px; height: 100px" :src="fileInfo.localPath"></audio>
        </div>
        <div class="file-item" v-else>
          <div class="file">
            <el-icon class="close-icon" @click="closePreview(fileInfo.fileId)">
              <Close />
            </el-icon>
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
import { reactive, watch } from 'vue'

interface fileBaseInfo {
  base64: string
  fileId: string
  fileName: string
  fileSize: number
  fileType: number
  localPath: string
}

const props = defineProps({
  fileInfoList: {
    type: Array as () => fileBaseInfo[],
    default: () => []
  }
})

const emit = defineEmits(['delete-file'])
const fileList = reactive([...props.fileInfoList])

const closePreview = (fileId: string) => {
  console.info('删除索引为', fileId, '的文件预览')
  emit('delete-file', fileId)
}

watch(
  () => props.fileInfoList,
  (newList) => {
    // 清空本地列表，重新同步
    fileList.length = 0
    newList.forEach((item) => fileList.push({ ...item }))
  },
  { immediate: true, deep: true } // 立即执行+深度监听
)
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
  z-index: 10;
}

.close-icon:hover {
  cursor: pointer;
  transform: scale(1.1);
  background-color: rgba(255, 255, 255, 0.2);
}

.file-preview-view {
  width: 100%;
  height: 120px;
  display: flex;
  position: relative;
  opacity: 0.8;
  overflow: hidden;
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
  scrollbar-width: none;
  gap: 20px;
}

.content::-webkit-scrollbar {
  display: none;
}

.content-main {
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  flex: 0 0 auto;
  gap: 20px;
}

.file-item {
  height: 100px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.file-image,
.file-video,
.file-audio .file {
  width: 100px;
  height: 100px;
}

.file {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.file-name {
  width: 140px;
  /* 强制文本不换行 */
  white-space: nowrap;
  /* 隐藏超出部分 */
  overflow: hidden;
  /* 超出部分显示省略号 */
  text-overflow: ellipsis;
  /* 行内块级，适配行内元素 */
  display: inline-block;
  text-align: center;
}
</style>
