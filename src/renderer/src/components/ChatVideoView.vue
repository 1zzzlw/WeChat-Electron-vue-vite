<template>
  <div class="chat-video">
    <span class="pause"></span>
    <img :src=previewBase64 alt="视频预览图片" class="chat-video-content" @click="openVideo"></img>
  </div>
</template>

<script setup lang="ts">
import { getVideoUrlList } from '@/db/dualDB'

const openVideo = async () => {
  const videoUrlList = await getVideoUrlList();
  (window as any).windowToolApi.createNewWindow('videoPreview', {
    currentVideoId: props.fileId,
    remoteUrl: props.remoteUrl,
    videoUrlList: videoUrlList
  })
}

const props = defineProps<{
  sendStatus: number
  fileId: string
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
.chat-video {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.chat-video-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pause {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 18px 0 18px 30px;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 5;
}
</style>
