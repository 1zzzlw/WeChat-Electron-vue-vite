<template>
  <div class="standalone-chat">
    <div class="standalone-header">
      <WindowControls :showSetTop="true" :showSetMiniSize="true" :showSetFullScreen="true"
        windowType="standaloneChat" />
    </div>
    <div class="standalone-body" v-if="conversation.id">
      <component :is="chatComponent" :conversation="conversation" :userId="userId" :avatarUrl="avatarUrl"
        :convId="conversation.id" />
    </div>
    <div v-else class="standalone-loading">
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import WindowControls from '@/components/WindowControls.vue'
import PrivateChat from '@/views/chat/PrivateChat.vue'
import GroupChat from '@/views/chat/GroupChat.vue'
import { type Conversation, initConversation } from '@/types/conversation'
import emitter from '@/utils/mitt'
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
let dataReceived = false
const handleWindowData = (data: any) => {
  if (!data || dataReceived) return
  dataReceived = true
  if (data.conversation) {
    conversation.value = data.conversation
  }
}

// 当会话ID变化时，通知 wsHandlers 当前正在查看的会话
watch(() => conversation.value.id, (newId) => {
  if (newId) {
    emitter.emit('standaloneActiveConvId', newId)
  }
}, { immediate: true })

onMounted(async () => {
  // 独立窗口需要单独注册 WS 消息监听器（App.vue 的监听器不能跨窗口生效）
  registerWsHandlers()
  // 注册文件传输监听器（上传/下载进度和状态回调）
  registerFileTransferHandlers()

  // 获取当前用户信息
  avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')

  // 先尝试主动拉取缓存数据（解决路由懒加载导致组件挂载晚于 show 事件的问题）
  const pendingData = await (window as any).windowToolApi.getPendingData()
  if (pendingData) {
    handleWindowData(pendingData)
  }
  // 如果 show 事件在组件挂载后才触发，仍能通过监听器接收
  (window as any).windowToolApi.sendWindowInfo((_e: any, data: any) => {
    handleWindowData(data)
  })
})

onUnmounted(() => {
  // 窗口关闭时清除标记
  emitter.emit('standaloneActiveConvId', null)
})
</script>

<style scoped>
.standalone-chat {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: rgba(28, 38, 50, 0.95);
  overflow: hidden;
}

.standalone-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  background-color: rgba(20, 30, 42, 0.95);
  border-bottom: 1px solid rgba(66, 153, 225, 0.15);
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
  color: rgba(240, 240, 240, 0.5);
  font-size: 14px;
}
</style>
