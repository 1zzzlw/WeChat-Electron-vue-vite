<template>
  <el-drawer
    v-model="visible"
    title="聊天资料"
    class="chat-details-drawer"
    size="min(400px, calc(100vw - 32px))"
    append-to-body
    destroy-on-close
  >
    <div class="chat-set-content">
      <div class="drawer-profile">
        <el-avatar :size="64" :src="conversation.avatar" />
        <h2>{{ displayName }}</h2>
        <p>
          {{ friendStore.isUserOnline(String(conversation.targetId)) ? '在线' : '离线' }} · 私聊
        </p>
      </div>
      <dl class="drawer-facts">
        <div>
          <dt>账号</dt>
          <dd>{{ friendStore.friendInfoMap[conversation.targetId]?.account || '未填写' }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ friendStore.friendInfoMap[conversation.targetId]?.remark || '暂无备注' }}</dd>
        </div>
      </dl>
      <section class="conversation-set" aria-label="会话偏好">
        <h3>会话偏好</h3>
        <div class="setting-row">
          <span><strong>置顶聊天</strong><small>让重要的对话始终在前</small></span
          ><el-switch
            aria-label="置顶聊天"
            :model-value="
              conversationStore.conversationMap[conversation.id]?.isTop ?? conversation.isTop
            "
            :active-value="1"
            :inactive-value="0"
            @change="changeTopStatus"
          />
        </div>
        <div class="setting-row">
          <span><strong>消息免打扰</strong><small>接收消息，减少声音打扰</small></span
          ><el-switch
            aria-label="消息免打扰"
            :model-value="
              conversationStore.conversationMap[conversation.id]?.isMute ?? conversation.isMute
            "
            :active-value="1"
            :inactive-value="0"
            @change="changeMuteStatus"
          />
        </div>
      </section>
      <section class="drawer-danger">
        <h3>聊天管理</h3>
        <el-button @click="clearMessageHistory">清空聊天记录</el-button
        ><el-button class="delete-friend" @click="deleteFriend">删除好友</el-button>
        <p>清理和删除操作前会再次确认。</p>
      </section>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  updateConversationTopStatus,
  updateConversationMuteStatus,
  clearHistoryMessageSync,
  deleteFriendSync,
  deleteConversationSync
} from '@/db/syncDB'
import { messageInfo } from '@/stores/modules/MessageStore'
import { friendInfo } from '@/stores/modules/ContactListStore'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { useRouter } from 'vue-router'
import { createContentJson, createSystemMessagePack } from '@/utils/systemMessageUtil'
import { getSystemMsgText, SystemMsgSubType } from '@/utils/constants'
import { Message } from '@/types/message'

const messageStore = messageInfo()
const friendStore = friendInfo()
const conversationStore = conversationInfo()
const router = useRouter()
const displayName = computed(
  () =>
    props.conversation.remark ||
    friendStore.friendInfoMap[props.conversation.targetId || '']?.remark ||
    props.conversation.name
)

const username = ref('')
const avatar = ref('')

const props = defineProps({
  conversation: { type: Object, default: () => ({}) },
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const changeTopStatus = (value: string | number | boolean) => {
  const status = Number(value)
  conversationStore.setConversationMap(props.conversation.id, {
    ...props.conversation,
    ...conversationStore.conversationMap[props.conversation.id],
    isTop: status
  })
  updateConversationTopStatus(props.conversation.id, props.conversation.userId, status)
}

const changeMuteStatus = async (value: string | number | boolean) => {
  const status = Number(value)
  try {
    await updateConversationMuteStatus(props.conversation.id, props.conversation.userId, status)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新免打扰状态失败')
  }
}

const clearMessageHistory = async () => {
  try {
    await ElMessageBox.confirm('确定清空此会话的聊天记录吗？', '清空聊天记录', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  messageStore.clearConversationMessages(props.conversation.id)
  clearHistoryMessageSync(props.conversation.id)
  ElMessage.success('聊天记录清理成功')
}

const deleteFriend = async () => {
  try {
    await ElMessageBox.confirm('确定删除此好友吗？', '删除好友', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  const friendId = props.conversation.targetId
  const conversationId = props.conversation.id
  deleteFriendSync(friendId)
  deleteConversationSync(conversationId)
  friendStore.deleteFriendMap(friendId)
  conversationStore.deleteConversation(conversationId)
  router.push({ name: 'messageList' })

  const tpl = getSystemMsgText(SystemMsgSubType.FRIEND_DELETED)
  const content = createContentJson(tpl, username.value, '', '', avatar.value)
  const receiverId = friendId
  const receiverIds = [friendId]

  const systemMessagePack = await createSystemMessagePack(
    receiverId,
    conversationId,
    SystemMsgSubType.FRIEND_DELETED,
    content,
    receiverIds
  )
  messageStore.sendSystemMessage(
    systemMessagePack as Message,
    conversationId,
    receiverIds as string[]
  )
}

watch(
  () => props.conversation.id,
  async () => {
    username.value = await (window as any).userInfoApi.storeGetUserInfo('username')
    avatar.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
  },
  { immediate: true }
)
</script>

<style scoped>
.chat-set-content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.drawer-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.drawer-profile .el-avatar {
  border-radius: var(--radius-lg);
  background: var(--color-surface-2);
}
h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-strong);
  overflow-wrap: anywhere;
}
.drawer-profile p,
.drawer-danger p {
  font-size: 11px;
  color: var(--color-text-muted);
}
.drawer-facts {
  padding: 16px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.drawer-facts > div {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  font-size: 12px;
}
dt {
  color: var(--color-text-muted);
}
dd {
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
  user-select: text;
}
h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}
.setting-row > span {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
strong {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}
small {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.drawer-danger {
  margin-top: auto;
  padding-top: 8px;
}
.drawer-danger .el-button {
  width: 100%;
  margin: 0 0 10px;
  height: 36px;
}
.delete-friend {
  color: var(--color-danger);
}
.drawer-danger p {
  margin-top: 4px;
}
</style>
