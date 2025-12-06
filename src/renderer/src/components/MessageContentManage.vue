<template>
  <div>
    <component :is="renderMessageContent()" />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import ChatImageView from './ChatImageView.vue'
import ChatVideoView from './ChatVideoView.vue'
import ChatAudioView from './ChatAudioView.vue'
import ChatFileView from './ChatFileView.vue'

const props = defineProps<{
  msgType?: number
  content?: string
  fileUrl?: string
}>()

const renderMessageContent = () => {
  const { msgType = 1, content = '', fileUrl = '' } = props
  switch (msgType) {
    case 1:
      return h('div', content)
    case 2:
      return h(ChatImageView, { fileUrl })
    case 3:
      return h(ChatVideoView, { fileUrl })
    case 4:
      return h(ChatAudioView, { fileUrl })
    case 5:
      return h(ChatFileView, { fileUrl })
    default:
      return h('div', content)
  }
}
</script>

<style scoped></style>
