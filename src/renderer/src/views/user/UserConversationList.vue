<template>
  <div class="user-message-list">
    <div class="user-message-list-left">
      <div class="message-list-top">
        <AutocompleteSearch />
        <el-dropdown trigger="click">
          <el-button style="background-color: rgba(35, 45, 60, 0.7); border-color: rgba(66, 153, 225, 0.2);"
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
              conversation.isTop === 0 ? { label: '置顶聊天' } : { label: '取消置顶' },
              { label: '标为未读' },
              { divider: true },
              conversation.isMute === 0 ? { label: '消息免打扰' } : { label: '取消消息免打扰' },
              { label: '独立窗口显示' },
              { divider: true },
              { label: '删除' },
            ]" @select="(item) => handleChoice(item, conversation.id)">
              <div class="left-list">
                <div class="left-image">
                  <UnreadCounts :unreadCounts="conversation.unreadCount" />
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
                  <div class="conversation-status"></div>
                </div>
              </div>
            </ContextMenu>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <div class="user-chat-list-right">
      <router-view></router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { Plus } from '@element-plus/icons-vue'
import { Conversation } from '@/types/conversation'
import AutocompleteSearch from '@/components/AutocompleteSearch.vue'
import UnreadCounts from '@/components/UnreadCounts.vue'
import ContextMenu from '@/components/ContextMenu.vue';
import { getConversationList, updateConversation } from '@/db/dualDB'
import { formatMessageTime } from '@/utils/utils'
import { updateConversationTopStatus, updateConversationMuteStatus } from '@/db/syncDB'
import { clearUnreadApi } from '@/api/Conversation'
import { Friend } from '@/types/friend'
import { getFriendList } from '@/db/dualDB'
import { friendInfo } from '@/stores/modules/ContactListStore'

const router = useRouter()
const active = ref<string | undefined>('')
const userId = ref()
const conversationStore = conversationInfo()
const friendInfoStore = friendInfo()

const starCall = async (conversation: Conversation) => {
  active.value = conversation.targetId

  if (!userId.value) {
    return
  }
  // 清除会话缓存中的未读消息数量
  conversationStore.clearUnreadCount(conversation.id as string)

  // 清除本地数据库中的未读消息数量
  const condition = { id: conversation.id }
  const data = { unreadCount: 0 }
  updateConversation(condition, data)

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

  // 向后端发送消息已读状态更新请求
  clearUnreadApi(conversation.id)

}

const createGroupChat = () => {
  // 打开创建群聊窗口
  (window as any).windowToolApi.createNewWindow('createGroup')
}

const handleChoice = (item: any, conversationId: string) => {
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
      break
    }
    case '消息免打扰': {
      // 更新缓存
      conversationStore.updateConversationMuteStatus(conversationId, 1)
      updateConversationMuteStatus(conversationId, userId.value, 1)
      break
    }
    case '取消消息免打扰': {
      // 更新缓存
      conversationStore.updateConversationMuteStatus(conversationId, 0)
      updateConversationMuteStatus(conversationId, userId.value, 0)
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
      const condition = {
        id: conversationId
      }
      const data = {
        status: 0
      }
      updateConversation(condition, data)
      // 从会话缓存中清除
      conversationStore.removeConversation(conversationId)
      // 切换路由
      router.push('/messageList')
      break
    }
  }
}

const addFriend = () => {
  // 打开添加好友窗口
  (window as any).windowToolApi.createNewWindow('addFriend')
}



const loadConversationList = async () => {
  // 判断缓存中是否存在，存在可以不去sqlite中加载数据
  const cache = conversationStore.initCache(userId.value as string)

  if (!cache) {
    // 此时缓存为空或缓存失效
    const conversationList = await getConversationList()

    // 将会话信息存入pinia缓存中
    conversationList.forEach((conversation: Conversation) => {
      conversation.latestMsgTime = formatMessageTime(conversation.latestMsgTime)
      conversationStore.setConversationMap(conversation.id, conversation)
    })
  }
}

// 可以检测会话的更新实时展示
const conversationListArr = computed(() => {
  const list = Object.values(conversationStore.conversationMap)

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
  color: #ffffff;
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
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.right-count {
  flex-shrink: 0;
  margin-left: 40px;
  position: relative;
  height: 50px;
}

.top-bg {
  background: linear-gradient(135deg,
      rgba(66, 153, 225, 0.15) 0%,
      rgba(66, 153, 225, 0.08) 100%);
  border-left: 3px solid rgba(66, 153, 225, 0.6);
  box-shadow: inset 0 0 20px rgba(66, 153, 225, 0.1);
  position: relative;
}

.top-bg::before {
  content: '📌';
  position: absolute;
  right: 10px;
  top: 5px;
  font-size: 12px;
  opacity: 0.6;
}

.left-list-time {
  position: absolute;
  top: 2px;
  right: 0;
  white-space: nowrap;
  font-size: 10px;
}

.user-status {
  position: absolute;
  top: 30px;
  right: 0;
}

.left-list-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  /* 防止头像被压缩 */
  flex-shrink: 0;
}

.user-chat-list-right {
  flex: 1;
  -webkit-app-region: drag;
}

.icon-ai-chat {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background-color: rgba(35, 45, 60, 0.7);
  color: #409eff;
}
</style>
