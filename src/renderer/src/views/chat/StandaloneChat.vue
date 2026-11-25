<template>
  <div class="standalone-chat">
    <div class="standalone-header">
      <WindowControls :showSetTop="true" :showSetMiniSize="true" :showSetFullScreen="true"
        windowType="standaloneChat" />
    </div>
    <div class="standalone-body" v-if="conversation.id">
      <component :is="chatComponent" :key="conversation.id" :conversation="conversation" :userId="userId" :avatarUrl="avatarUrl"
        :convId="conversation.id" />
    </div>
    <div v-else class="standalone-loading">
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import WindowControls from '@/components/WindowControls.vue'
import PrivateChat from '@/views/chat/PrivateChat.vue'
import GroupChat from '@/views/chat/GroupChat.vue'
import { type Conversation, initConversation } from '@/types/conversation'
import { registerWsHandlers } from '@/handlers/wsHandlers'
import { registerFileTransferHandlers } from '@/handlers/fileTransferHandlers'

const userId = ref<string | number>('')
const avatarUrl = ref('')
const conversation = ref<Conversation>(initConversation())

// 根据会话类型动态选择聊天组件
const chatComponent = computed(() => {
  return conversation.value?.type === 1 ? GroupChat : PrivateChat
})

// 接收窗口数据
let removeWindowListener: (() => void) | undefined
const handleWindowData = (data: { conversation?: Conversation } | null) => {
  if (data?.conversation?.id) {
    conversation.value = data.conversation
  }
}

onMounted(async () => {
  // 独立窗口需要单独注册 WS 消息监听器（App.vue 的监听器不能跨窗口生效）
  registerWsHandlers()
  // 注册文件传输监听器（上传/下载进度和状态回调）
  registerFileTransferHandlers()

  // 获取当前用户信息
  avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')

  const windowTool = (window as any).windowToolApi
  let receivedLiveData = false
  removeWindowListener = windowTool.sendWindowInfo((_event: unknown, data: { conversation?: Conversation }) => {
    receivedLiveData = true
    handleWindowData(data)
  })
  const pendingData = await windowTool.getPendingData()
  if (!receivedLiveData) handleWindowData(pendingData)
})
onUnmounted(() => removeWindowListener?.())

</script>

<style scoped>
.standalone-chat {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-deep);
  overflow: hidden;
}

.standalone-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  background-color: var(--color-surface-1);
  border-bottom: 1px solid var(--color-border-subtle);
  -webkit-app-region: drag;
  position: relative;
  flex-shrink: 0;
}

.standalone-body {
  flex: 1;
  overflow: hidden;
}

.standalone-loading {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
