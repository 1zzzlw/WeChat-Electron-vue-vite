<template>
  <div class="chat-image">
    <img :src="fileUrl" alt="聊天图片" class="chat-image-content" @click="openImage" />
  </div>
</template>

<script setup lang="ts">
const openImage = () => {
  console.log('openImage')
}

defineProps({
  fileUrl: {
    type: String,
    default: ''
  }
})
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

.chat-image-content:hover {
  transform: scale(1.1);
  transition: transform 0.3s ease-in-out;
}
</style>
