<template>
  <ChatBase
    :conversation="conversation"
    :userId="userId"
    :avatarUrl="avatarUrl"
    :getSenderAvatar="getGroupMemberAvatar"
    :getSenderName="getGroupMemberName"
    :convId="convId"
    @red-packet="handleRedPacket"
  >
    <!-- 群聊专属工具栏：红包按钮 -->
    <template #toolbar-extra>
      <el-button class="red-packet-btn" :icon="Money" size="large" square title="发红包" @click="handleRedPacket"></el-button>
    </template>
  </ChatBase>
</template>

<script setup lang="ts">
import { Money } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
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

// 红包按钮点击（后续实现完整交互：弹窗输入金额/个数 → 调用API → 发送红包消息）
const handleRedPacket = () => {
  ElMessage.info('红包功能开发中...')
  // TODO: 实现红包发送流程
  // 1. 弹出红包配置弹窗（金额、个数、祝福语）
  // 2. 调用 POST /redPacket/send 创建红包
  // 3. 发送 msgType=7 的红包消息到群聊
}
</script>

<style scoped>
.red-packet-btn {
  width: 30px !important;
  height: 30px !important;
  margin: 0 !important;
  font-size: 20px !important;
  background-color: transparent !important;
  border: none !important;
  color: rgba(240, 240, 240, 0.8) !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.red-packet-btn:hover {
  color: #ff4d4f !important;
  text-shadow: 0 0 6px rgba(255, 77, 79, 0.4);
}

.red-packet-btn:active {
  color: #cf1322 !important;
}
</style>
