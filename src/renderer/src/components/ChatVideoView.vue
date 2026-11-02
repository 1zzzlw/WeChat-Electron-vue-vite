<template>
  <div class="chat-video">
    <span class="pause"></span>
    <img v-if="!previewFailed && previewSource" :src="previewSource" alt="视频预览图片" class="chat-video-content" loading="lazy" @error="previewFailed = true" @click="openVideo" />
    <button v-else class="video-placeholder" @click="openVideo">视频 · 点击播放</button>
  </div>
</template>

<script setup lang="ts">
import { getVideoUrlList } from '@/db/dualDB'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  sendStatus: number
  fileId: string
  fileName: string
  fileSize: number
  localPath: string
  remoteUrl: string
  previewUrl: string
  downloadStatus: number
  receiveTime: string
}>()

const previewFailed = ref(false)
const previewSource = computed(() => props.previewUrl || (props.remoteUrl ? `${props.remoteUrl}.preview` : ''))
watch(previewSource, () => { previewFailed.value = false })

const openVideo = async () => {
  const videoUrlList = await getVideoUrlList();
  (window as any).windowToolApi.createNewWindow('videoPreview', {
    currentVideoId: props.fileId,
    remoteUrl: props.remoteUrl,
    videoUrlList: videoUrlList
  })
}
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
.video-placeholder { width: 220px; min-height: 140px; padding-top: 65px; border: 0; background: var(--color-surface-1); color: var(--color-text-muted); cursor: pointer; }

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
