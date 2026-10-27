<template>
  <div class="user-message-list">
    <div class="user-message-list-left">
      <div class="message-list-top">
        <AutocompleteSearch />
        <el-dropdown trigger="click">
          <el-button style="background-color: var(--color-surface-1); border-color: var(--color-border-subtle);"
            :icon="Plus" square></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="createGroupChat">发起群聊</el-dropdown-item>
              <el-dropdown-item @click="addFriend">添加好友</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="message-list-bottom">
        <el-scrollbar>
          <div v-for="conversation in conversationListArr" :key="conversation.id" :class="{
            'left-list-bg': active === conversation.id,
            'top-bg': conversation.isTop === 1
          }" @click="starCall(conversation)">
            <ContextMenu :menu="[
              conversation.isTop === 1 ? { label: '取消置顶' } : { label: '置顶聊天' },
              Number(conversation.unreadCount) > 0 ? { label: '标为已读' } : { label: '标为未读' },
              { divider: true },
              conversation.isMute === 1 ? { label: '取消消息免打扰' } : { label: '消息免打扰' },
              { label: '独立窗口显示' },
              { divider: true },
              { label: '删除' },
            ]" @select="(item) => handleChoice(item, conversation.id)">
              <div class="left-list">
                <div class="left-image">
                  <UnreadCounts class="avatar-unread" :unreadCounts="Number(conversation.unreadCount) || 0" />
                  <div v-if="conversation.type === 2 && conversation.avatar === null" class="iconfont icon-ai-chat">
                  </div>
                  <img v-else :src="conversation.avatar + '?t=' + Date.now()" alt="头像" class="left-list-img" />
                </div>
                <div class="mid-message">
                  <h1 class="friend-name">{{ conversation.remark || friendInfoStore.friendInfoMap[conversation.targetId
                    ||
                    '']?.remark || conversation.name }}</h1>
                  <div class="friend-message">{{ conversation.latestMsg }}</div>
                </div>
                <div class="right-count">
                  <div class="left-list-time" v-if="conversation.latestMsgTime !== 'Invalid Date'">
                    {{ conversation.latestMsgTime }}
                  </div>
                  <div v-if="conversation.isMute === 1 || conversation.isTop === 1" class="conversation-status">
                    <el-icon v-if="conversation.isTop === 1" title="已置顶" aria-label="已置顶"><Top /></el-icon>
                    <el-icon v-if="conversation.isMute === 1" title="消息免打扰" aria-label="消息免打扰"><MuteNotification /></el-icon>
                  </div>
                </div>
              </div>
            </ContextMenu>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <div class="user-chat-list-right">
      <router-view v-slot="{ Component }">
        <component :is="Component" v-if="Component" />
        <ChatWelcome v-else :userName="userName" :conversations="conversationListArr"
          @open="starCall" @add-friend="addFriend" @create-group="createGroupChat" />
      </router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { Plus, MuteNotification, Top } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { Conversation } from '@/types/conversation'
import AutocompleteSearch from '@/components/AutocompleteSearch.vue'
import UnreadCounts from '@/components/UnreadCounts.vue'
import ContextMenu from '@/components/ContextMenu.vue';
import ChatWelcome from '@/components/ChatWelcome.vue'
import { getConversationList, updateConversation } from '@/db/dualDB'
import { formatMessageTime } from '@/utils/utils'
import { updateConversationTopStatus, updateConversationMuteStatus } from '@/db/syncDB'
import { markConversationRead, markConversationUnread } from '@/services/conversationRead'
import { Friend } from '@/types/friend'
import { getFriendList } from '@/db/dualDB'
import { friendInfo } from '@/stores/modules/ContactListStore'

const router = useRouter()
const active = ref<string | undefined>('')
const userId = ref()
const userName = ref('')
const conversationStore = conversationInfo()
const friendInfoStore = friendInfo()

const starCall = async (conversation: Conversation) => {
  active.value = conversation.id

  if (!userId.value) {
    return
  }
  if (conversation.type !== 2) {
    void markConversationRead(conversation.id).catch(error => ElMessage.warning(`未读状态暂未同步：${error.message}`))
  }

  if (conversation.type === 2) {
    // 进入ai聊天窗口
    await router.push({
      path: '/aiChat',
      // 传递会话id
      query: { conversationId: conversation.id }
    })
  } else {
    // 进入好友聊天窗口
    await router.push({
      path: '/chat',
      // 传递会话id
      query: { conversationId: conversation.id }
    })
  }

}

const createGroupChat = () => {
  // 打开创建群聊窗口
  (window as any).windowToolApi.createNewWindow('createGroup')
}

const handleChoice = async (item: any, conversationId: string) => {
  try {
    switch (item.label) {
      case '置顶聊天': {
        // 更新缓存
        conversationStore.updateConversationTopStatus(conversationId, 1)
        updateConversationTopStatus(conversationId, userId.value, 1)
        break
      }
      case '取消置顶': {
        conversationStore.updateConversationTopStatus(conversationId, 0)
        updateConversationTopStatus(conversationId, userId.value, 0)
        break
      }
      case '标为未读': {
        await markConversationUnread(conversationId)
        break
      }
      case '标为已读': {
        await markConversationRead(conversationId)
        break
      }
      case '消息免打扰': {
        await updateConversationMuteStatus(conversationId, userId.value, 1)
        break
      }
      case '取消消息免打扰': {
        await updateConversationMuteStatus(conversationId, userId.value, 0)
        break
      }
      case '独立窗口显示': {
        const conversation = conversationStore.conversationMap[conversationId]
        if (conversation) {
          (window as any).windowToolApi.createNewWindow('standaloneChat', { conversation: toRaw(conversation) })
          // 主窗口跳转会话列表，不再显示聊天视图（避免缓存同步等问题）
          active.value = ''
          router.push('/messageList')
        }
        break
      }
      case '删除': {
        // 更新会话状态为不显示
        const condition = { id: conversationId }
        const data = { status: 0 }
        updateConversation(condition, data)
        conversationStore.removeConversation(conversationId)
        router.push('/messageList')
        break
      }
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新会话状态失败，请重试')
  }
}

const addFriend = () => {
  // 打开添加好友窗口
  (window as any).windowToolApi.createNewWindow('addFriend')
}



const loadConversationList = async () => {
  conversationStore.initCache(userId.value as string)
  // 登录同步写入 SQLite 后，以数据库的未读/免打扰状态更新旧的界面缓存。
  const conversationList = await getConversationList()
  conversationList.forEach((conversation: Conversation) => {
    conversation.latestMsgTime = formatMessageTime(conversation.latestMsgTime)
    conversationStore.setConversationMap(conversation.id, conversation)
  })
}

// 可以检测会话的更新实时展示
const conversationListArr = computed(() => {
  // AI 工作台使用 Main 的独立导航，普通会话列表只保留单聊和群聊
  const list = Object.values(conversationStore.conversationMap)
    .filter((conversation) => conversation.type !== 2 && conversation.status !== 0)

  // 按置顶和时间排序
  return list.sort((a: any, b: any) => {
    // 置顶的排前面
    if (a.isTop !== b.isTop) {
      return b.isTop - a.isTop
    }

    if (!a.latestMsgTime) return 1
    if (!b.latestMsgTime) return -1

    // 都置顶或都不置顶，按时间排序
    return b.latestMsgTime.localeCompare(a.latestMsgTime)
  })
})

const loadFriendList = async () => {
  const cache = friendInfoStore.initCache(userId.value as string)

  if (!cache) {
    // 缓存失效，重新获取
    const friendList = await getFriendList()
    friendList.forEach((friendInfo: Friend) => {
      friendInfoStore.setFriendMap(friendInfo.friendId, friendInfo)
    })
    friendInfoStore.restoreOnlineStatus()
  }
}


onMounted(async () => {
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')
  userName.value = await (window as any).userInfoApi.storeGetUserInfo('username') || ''

  // 查询会话列表
  loadConversationList()

  // 初始化好友列表
  loadFriendList()
})
</script>

<style scoped>
@import "@/css/layout.css";

.mid-message {
  flex: 1;
  /* 允许内容在空间不足时换行 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.friend-name {
  font-size: 16px;
  color: var(--color-text-primary);
  margin: 0;
  /*单行文本溢出显示省略号*/
  /*强制不换行*/
  white-space: nowrap;
  /*溢出部分进行隐藏*/
  overflow: hidden;
  /*文字移除的时候，显示省略号*/
  text-overflow: ellipsis;
  line-height: 1.4;
}

.friend-message {
  font-size: 13px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.right-count {
  flex-shrink: 0;
  min-width: 40px;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.top-bg {
  background: linear-gradient(135deg,
      rgba(var(--color-accent-rgb), 0.15) 0%,
      rgba(var(--color-accent-rgb), 0.08) 100%);
  border-left: 3px solid rgba(var(--color-accent-rgb), 0.6);
  box-shadow: inset 0 0 20px rgba(var(--color-accent-rgb), 0.1);
  position: relative;
}

.left-list-time {
  min-height: 14px;
  line-height: 14px;
  white-space: nowrap;
  font-size: 10px;
}

.user-status {
  position: absolute;
  top: 30px;
  right: 0;
}

.conversation-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1;
}

/* 固定头像尺寸；角标脱离普通文档流，不挤压头像、昵称或时间。 */
.left-image {
  position: relative;
  flex: 0 0 50px;
  width: 50px;
  height: 50px;
}

.avatar-unread {
  position: absolute;
  top: -5px;
  right: -5px;
  z-index: 1;
}

.left-list-img {
  display: block;
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 10px;
  /* 防止头像被压缩 */
  flex-shrink: 0;
}

.user-chat-list-right {
  flex: 1;
  min-width: 0;
  min-height: 0;
  -webkit-app-region: drag;
}

.left-list-bg {
  background: var(--color-accent-soft);
  box-shadow: inset 3px 0 var(--color-accent);
}

.icon-ai-chat {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background-color: rgba(var(--color-surface-rgb), 0.7);
  color: #409eff;
}
</style>
