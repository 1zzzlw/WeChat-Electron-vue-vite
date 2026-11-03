<template>
  <header class="chat-header">
    <button type="button" class="header-identity" aria-label="查看聊天资料" @click="openDrawer">
      <el-avatar :src="conversation.avatar || undefined" :size="42"
        ><el-icon><ChatDotRound /></el-icon
      ></el-avatar>
      <span class="identity-copy"
        ><span class="chat-title">{{ displayName }}</span
        ><span class="chat-subtitle"
          ><i :class="{ online: isOnline }"></i
          >{{
            conversation.type === 1
              ? '群聊' + (memberCount ? ' · ' + memberCount + ' 位成员' : '')
              : isOnline
                ? '在线 · 随时保持连接'
                : '离线 · 消息会为你保留'
          }}</span
        ></span
      >
    </button>
    <div class="header-actions">
      <span v-if="isTop" class="header-tag"
        ><el-icon><Top /></el-icon>置顶</span
      ><span v-if="isMute" class="header-tag"
        ><el-icon><MuteNotification /></el-icon>免打扰</span
      ><el-button
        v-if="conversation.type === 1"
        :icon="Plus"
        aria-label="邀请群成员"
        title="邀请成员"
        @click="inviteDialogVisible = true"
      /><el-button class="details-button" :icon="Setting" @click="openDrawer">聊天资料</el-button>
    </div>
    <ChatHeaderPrivateDrawer v-model="drawerPrivate" :conversation="conversation" />
    <ChatHeaderGroupDrawer
      v-model="drawerGroup"
      :conversation="conversation"
      @openInvite="inviteDialogVisible = true"
    />
    <ChatHeaderInviteDialog v-model="inviteDialogVisible" :conversation="conversation" />
  </header>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { ChatDotRound, Setting, Plus, Top, MuteNotification } from '@element-plus/icons-vue'
import { friendInfo } from '@/stores/modules/ContactListStore'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { groupMemberInfo } from '@/stores/modules/GroupMemberStore'
import ChatHeaderPrivateDrawer from '@/components/ChatHeaderPrivateDrawer.vue'
import ChatHeaderGroupDrawer from '@/components/ChatHeaderGroupDrawer.vue'
import ChatHeaderInviteDialog from '@/components/ChatHeaderInviteDialog.vue'

const props = defineProps({ conversation: { type: Object, default: () => ({}) } })
const friendStore = friendInfo()
const conversationStore = conversationInfo()
const groupStore = groupMemberInfo()
const drawerPrivate = ref(false)
const drawerGroup = ref(false)
const inviteDialogVisible = ref(false)
const displayName = computed(
  () =>
    props.conversation.remark ||
    friendStore.friendInfoMap[props.conversation.targetId || '']?.remark ||
    props.conversation.name ||
    '对话'
)
const isOnline = computed(
  () =>
    props.conversation.type === 0 && friendStore.isUserOnline(String(props.conversation.targetId))
)
const memberCount = computed(() => groupStore.groupMemberMap[props.conversation.id]?.length || 0)
const isTop = computed(
  () => conversationStore.conversationMap[props.conversation.id]?.isTop ?? props.conversation.isTop
)
const isMute = computed(
  () =>
    conversationStore.conversationMap[props.conversation.id]?.isMute ?? props.conversation.isMute
)
const openDrawer = () => {
  if (props.conversation.type === 0) drawerPrivate.value = true
  else drawerGroup.value = true
}
watch(
  () => props.conversation.id,
  () => {
    drawerPrivate.value = false
    drawerGroup.value = false
    inviteDialogVisible.value = false
  }
)
</script>

<style scoped>
.chat-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  min-height: 104px;
  padding: 36px 24px 16px;
  gap: 16px;
  background: var(--color-chat-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-primary);
  -webkit-app-region: drag;
}
.header-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: inherit;
  text-align: left;
  cursor: var(--cursor-pointer, pointer);
  -webkit-app-region: no-drag;
}
.header-identity .el-avatar {
  flex-shrink: 0;
  border-radius: var(--radius-md);
  color: var(--color-accent);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-subtle);
}
.identity-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 11px;
  white-space: nowrap;
}
.chat-subtitle i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-text-muted);
}
.chat-subtitle i.online {
  background: var(--color-success);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}
.header-actions .el-button {
  margin: 0;
  height: 34px;
}
.header-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--color-text-muted);
}
@media (max-width: 900px) {
  .header-tag {
    display: none;
  }
  .chat-header {
    padding-left: 20px;
    padding-right: 20px;
  }
}
@media (max-width: 650px) {
  .details-button {
    padding: 8px;
  }
  .chat-subtitle {
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
