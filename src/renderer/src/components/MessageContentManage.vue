<template>
  <div>
    <component :is="currentComponent" v-bind="currentProps" @open="handleRedPacketOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChatImageView from './ChatImageView.vue'
import ChatVideoView from './ChatVideoView.vue'
import ChatAudioView from './ChatAudioView.vue'
import ChatFileView from './ChatFileView.vue'
import ChatRedPacketView from './ChatRedPacketView.vue'
import type { MessageContentManageProps } from '../types/message'

const props = defineProps<MessageContentManageProps>()
const emit = defineEmits<{
  'red-packet-open': [data: { redPacketId: string; id: string; conversationId: string }]
}>()

const fileProps = computed(() => ({
  sendStatus: props.sendStatus || 0,
  fileId: props.fileId || '',
  fileName: props.fileName || '',
  fileSize: props.fileSize || 0,
  localPath: props.localPath || '',
  remoteUrl: props.remoteUrl || '',
  previewBase64: props.previewBase64 || '',
  downloadStatus: props.downloadStatus || 0,
  receiveTime: props.receiveTime || '',
  isUpload: props.isUpload || false
}))

const redPacketProps = computed(() => {
  let parsed: any = {}
  try { parsed = JSON.parse(props.content || '{}') } catch { /* ignore */ }
  return {
    redPacketId: parsed.redPacketId || '',
    amount: parsed.amount || 0,
    status: parsed.status ?? 0,
    senderName: parsed.senderName || '',
    sendStatus: props.sendStatus || 0,
    id: props.id,
    conversationId: props.conversationId,
    senderId: props.senderId
  }
})

const currentComponent = computed(() => {
  switch (props.msgType) {
    case 2: return ChatImageView
    case 3: return ChatVideoView
    case 4: return ChatAudioView
    case 5: return ChatFileView
    case 6: return ChatRedPacketView
    default: return null
  }
})

const currentProps = computed(() => {
  switch (props.msgType) {
    case 2: case 3: case 4: case 5:
      return fileProps.value
    case 6:
      return redPacketProps.value
    default:
      return {}
  }
})

const handleRedPacketOpen = (data: { redPacketId: string; id: string; conversationId: string }) => {
  emit('red-packet-open', data)
}
</script>

<style scoped></style>
