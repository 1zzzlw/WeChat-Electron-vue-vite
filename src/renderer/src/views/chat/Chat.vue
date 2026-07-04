<template>
  <component
    :is="chatComponent"
    :conversation="conversation"
    :userId="userId"
    :avatarUrl="avatarUrl"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PrivateChat from '@/views/chat/PrivateChat.vue'
import GroupChat from '@/views/chat/GroupChat.vue'
import { initConversation, type Conversation } from '@/types/conversation'
import { conversationInfo } from '@/stores/modules/ConversationStore'

const route = useRoute()
const conversationStore = conversationInfo()

const userId = ref<string | number>('')
const avatarUrl = ref('')
const conversation = ref<Conversation>(initConversation())

// 根据会话类型动态选择聊天组件
const chatComponent = computed(() => {
  return conversation.value?.type === 1 ? GroupChat : PrivateChat
})

// 监听会话切换，加载对应会话信息并初始化用户数据
watch(
  () => route.query.conversationId,
  async (newConversationId, oldConversationId) => {
    if (!newConversationId) return

    // 初始化会话信息（加 fallback 防止 store 未就绪时 conversation 变为 undefined）
    const storeEntry = conversationStore.conversationMap[newConversationId as string]
    if (storeEntry) {
      conversation.value = storeEntry
    }

    // 第一次加载时获取用户头像和ID
    if (oldConversationId === undefined) {
      avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
      userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')
    }
  },
  { immediate: true }
)
</script>
