<template>
  <div class="chat-video">
    <video :src="localPath" class="chat-video-content" controls></video>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sendStatus: number
  fileName: string
  fileSize: number
  localPath: string
  remoteUrl: string
  downloadStatus: number
  receiveTime: string
}>()
</script>

<style scoped>
.chat-video {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.chat-video-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
