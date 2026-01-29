<template>
  <div class="chat-image">
    <el-skeleton style="width: 180px">
      <template #template>
        <img :src=previewBase64 alt="聊天图片" class="chat-image-content" @click="openImage" />
        <!-- <el-skeleton-item variant="image" style="width: 240px; height: 240px" /> -->
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
const openImage = () => {
  console.log('openImage')
}

const props = defineProps<{
  sendStatus: number
  fileName: string
  fileSize: number
  localPath: string
  remoteUrl: string
  previewBase64: string
  downloadStatus: number
  receiveTime: string
}>()

</script>

<style scoped>
.chat-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.chat-image-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  image-rendering: high-quality;
}

/* .chat-image-content:hover {
  transform: scale(1.1);
  transition: transform 0.3s ease-in-out;
} */
</style>
