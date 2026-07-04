<template>
  <div>
    <component :is="currentComponent" v-bind="currentProps" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChatImageView from '@/components/ChatImageView.vue'
import ChatVideoView from '@/components/ChatVideoView.vue'
import ChatAudioView from '@/components/ChatAudioView.vue'
import ChatFileView from '@/components/ChatFileView.vue'
import ChatRedPacketView from '@/components/ChatRedPacketView.vue'
import type { MessageContentManageProps } from '@/types/message'

const props = defineProps<MessageContentManageProps>()

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

const redPacketProps = computed(() => ({
  redPacketId: props.redPacketId || '',
  id: props.id,
  conversationId: props.conversationId,
  senderId: props.senderId
}))

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

</script>

<style scoped></style>
