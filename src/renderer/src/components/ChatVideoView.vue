<template>
  <div class="chat-video">
    <video :src="fileUrl" class="chat-video-content" controls></video>
  </div>
</template>

<script setup lang="ts">
defineProps({
  fileUrl: {
    type: String,
    default: ''
  }
})
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
