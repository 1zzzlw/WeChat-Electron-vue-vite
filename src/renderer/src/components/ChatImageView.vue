<template>
  <div class="chat-image">

    <div class="img-wrap">
      <!-- <img class="icon" src="../assets/download.svg" alt="" /> -->
      <img v-if="imageSource" :src="imageSource" alt="聊天图片" class="chat-image-content" loading="lazy" @error="fallbackToOriginal" @click="openImage">
      <button v-else class="media-placeholder" @click="openImage">图片加载失败，点击查看原图</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getImageUrlList } from '@/db/dualDB'

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

const failedPreview = ref(false)
const failedOriginal = ref(false)
const imageSource = computed(() => failedOriginal.value ? '' : failedPreview.value
  ? props.remoteUrl : props.previewUrl || (props.remoteUrl ? `${props.remoteUrl}.preview` : ''))
const fallbackToOriginal = () => {
  if (!failedPreview.value) failedPreview.value = true
  else failedOriginal.value = true
}
watch(() => [props.previewUrl, props.remoteUrl], () => {
  failedPreview.value = false
  failedOriginal.value = false
})

const openImage = async () => {
  const imageUrlList = await getImageUrlList();

  (window as any).windowToolApi.createNewWindow('imagePreview', {
    currentImageId: props.fileId,
    remoteUrl: props.remoteUrl,
    imageUrlList: imageUrlList
  })
}
</script>

<style scoped>
.chat-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.img-wrap {
  position: relative;
}

.chat-image-content {
  width: 100%;
  height: 100%;
  object-fit: contain;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  image-rendering: high-quality;
}
.media-placeholder { min-height: 100px; padding: 16px; color: var(--color-text-muted); background: var(--color-surface-1); border: 0; cursor: pointer; }

.icon {
  width: 80px;
  height: 80px;
  position: absolute;
  top: 25%;
  left: 30%;
  opacity: 0.5;
}

/* .chat-image-content:hover {
  transform: scale(1.1);
  transition: transform 0.3s ease-in-out;
} */
</style>
