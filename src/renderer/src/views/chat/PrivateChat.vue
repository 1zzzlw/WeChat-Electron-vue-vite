<template>
  <ChatBase
    :conversation="conversation"
    :userId="userId"
    :avatarUrl="avatarUrl"
    :convId="convId"
  />
</template>

<script setup lang="ts">
import ChatBase from '@/views/chat/ChatBase.vue'
import type { Conversation } from '@/types/conversation'

// 单聊组件：无额外逻辑，直接使用 ChatBase 的默认行为
// - 头像：直接使用 conversation.avatar（对方头像）
// - 名称：直接使用 conversation.remark || conversation.name
// - 无群成员加载、无红包按钮
defineProps<{
  conversation: Conversation
  userId: string | number
  avatarUrl: string
  convId?: string
}>()
</script>
