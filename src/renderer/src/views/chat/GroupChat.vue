<template>
  <ChatBase
    :conversation="conversation"
    :userId="userId"
    :avatarUrl="avatarUrl"
    :getSenderAvatar="getGroupMemberAvatar"
    :getSenderName="getGroupMemberName"
    :convId="convId"
  />
</template>

<script setup lang="ts">
import ChatBase from './ChatBase.vue'
import { groupMemberInfo } from '../../stores/modules/GroupMemberStore'
import type { Conversation } from '../../types/conversation'

const props = defineProps<{
  conversation: Conversation
  userId: string | number
  avatarUrl: string
  convId?: string
}>()

const groupMemberStore = groupMemberInfo()

// 群聊：根据发送者ID获取群成员头像
const getGroupMemberAvatar = (senderId: string | number): string => {
  return groupMemberStore.getGroupMemberAvatar(senderId) || props.conversation.avatar || ''
}

// 群聊：根据发送者ID获取群成员名称
const getGroupMemberName = (senderId: string | number): string | undefined => {
  const convId = props.conversation.id as string
  const members = groupMemberStore.groupMemberMap[convId] || []
  const member = members.find(m => String(m.userId) === String(senderId))
  return member?.username || undefined
}
</script>
