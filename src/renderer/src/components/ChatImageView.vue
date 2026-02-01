<template>
  <div class="chat-image">

    <div class="img-wrap">
      <!-- <img class="icon" src="../assets/download.svg" alt="" /> -->
      <img :src=previewBase64 alt="聊天图片" class="chat-image-content" @click="openImage">
    </div>

  </div>

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const loading = ref()

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

onMounted(() => {
  loading.value = props.sendStatus === 1 ? false : true;

  // (window as any).uploadFileApi.updateLoadStatus((e: any, status: any) => {
  //   console.log(status)
  //   loading.value = status === 1 ? false : true;
  //   console.log(loading.value)
  // })
})

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
