<template>
  <div>
    <component :is="renderMessageContent()" />
  </div>
</template>

<script setup lang="ts">
import { h, computed } from 'vue'
import ChatImageView from './ChatImageView.vue'
import ChatVideoView from './ChatVideoView.vue'
import ChatAudioView from './ChatAudioView.vue'
import ChatFileView from './ChatFileView.vue'
import { Message } from '../types/message'

const props = defineProps<Message>()

const renderMessageContent = () => {
  const { msgType = 1 } = props

  const fileProps = computed(() => ({
    sendStatus: props.sendStatus || 0,
    fileId: props.fileId || '',
    fileName: props.fileName || '',
    fileSize: props.fileSize || 0,
    localPath: props.localPath || '',
    remoteUrl: props.remoteUrl || '',
    previewBase64: props.previewBase64 || '',
    downloadStatus: props.downloadStatus || 0,
    receiveTime: props.receiveTime || ''
  }))

  switch (msgType) {
    case 2:
      return h(ChatImageView, fileProps.value)
    case 3:
      return h(ChatVideoView, fileProps.value)
    case 4:
      return h(ChatAudioView, fileProps.value)
    case 5:
      return h(ChatFileView, fileProps.value)
    default:
      return h('div', '暂无此消息类型')
  }
}
</script>

<style scoped></style>
