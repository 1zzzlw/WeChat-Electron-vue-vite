<template>
  <div class="chat-count" v-if="isDataLoaded">
    <div class="chat-title">
      {{ friendRemark === '' ? friendUsername : friendRemark }}
    </div>
    <div class="chat-content">
      <el-scrollbar ref="chatScrollbar">
        <div class="chat-message" v-for="(message, index) in messageArr" :key="index">
          <div class="chat-list-right" v-if="String(message.senderId) === String(userId)">
            <img :src="avatarUrl" class="list-image" />
            <div class="right-msg">{{ message.content }}</div>
          </div>
          <div class="chat-list-left" v-else>
            <img :src="friendAvatar" class="list-image" />
            <div class="msg">
              <div class="left-name" v-if="message.remark === ''">{{ friendUsername }}</div>
              <div class="left-name" v-else>{{ friendRemark }}</div>
              <div class="left-msg">{{ message.content }}</div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="chat-tool">
      <el-button :icon="Eleme" size="large" square></el-button>
      <el-button :icon="Folder" size="large" square></el-button>
      <el-button :icon="Scissor" size="large" square></el-button>
      <el-button :icon="VideoCamera" size="large" square></el-button>
    </div>
    <div class="chat-input">
      <el-input
        v-model="message"
        type="textarea"
        :rows="4"
        resize="none"
        placeholder="请输入消息"
        spellcheck="false"
        clearable
      />
    </div>
    <div class="sendButton">
      <el-button type="success" @click="sendMessage">发送</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMessageListApi, sendMessageApi } from '../../api/Message'
import { messageInfo } from '../../stores/MessageStore'
import dayjs from 'dayjs'
import { WSManager } from '../../utils/websocket.js'
import { conversationInfo } from '../../stores/ConversationStore'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'
import { groupMemberInfo } from '../../stores/GroupMemberStores'
import { getGroupMemberListApi } from '../../api/Conversation'

// 添加数据加载状态标记
const isDataLoaded = ref(false)
const route = useRoute()
const message = ref('')
const arr = reactive({ list: [] })
const avatarUrl = ref('')
const userId = ref()
const chatScrollbar = ref(null)

const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()

const sendMessage = () => {
  console.info(
    '接收消息用户的ID:',
    route.query.friendId,
    '消息内容:',
    message.value,
    '会话id:',
    route.query.conversationId
  )
  const convId = route.query.conversationId
  if (convId.startsWith('g_')) {
    // ws发送群聊信息：群聊id、消息内容、接收者数组
    console.info('群成员列表:', groupMemberStore.groupMemberMap[convId])
    console.info(
      '群成员ID列表:',
      groupMemberStore.groupMemberMap[convId].map((item) => item.userId)
    )
    WSManager.sendMessage(3, 0, {
      conversationId: convId,
      receiverIds: groupMemberStore.groupMemberMap[convId].map((item) => item.userId),
      content: message.value
    })
  } else {
    // ws发送单聊信息：会话id、接收者id、消息内容
    WSManager.sendMessage(1, 0, {
      conversationId: convId,
      receiverId: route.query.friendId,
      content: message.value
    })
  }

  // http发送接收者id、会话id、消息内容
  sendMessageApi({
    receiverId: route.query.friendId,
    conversationId: convId,
    content: message.value
  }).then((res) => {
    console.info('发送消息成功', res)
    message.value = ''
    if (res.data) {
      messageStore.addMessageMap(convId, res.data)
      conversationStore.setConversationMap(convId, {
        latestMsg: res.data.content,
        latestMsgTime: dayjs(res.data.sendTime).format('HH:mm')
      })
    }
  })
}

const getMessageList = async () => {
  const convId = route.query.conversationId

  console.info('获取消息列表，会话id:', convId)

  if (!convId) {
    console.info('会话id不存在')
    return
  }

  // 此时群聊会话和单聊会话一起存储，只是格式差别比较大
  messageStore.initMessageMap(convId)

  // 再判断缓存（此时 messageMap[convId] 一定是数组，不会报错）
  const cache = messageStore.messageMap[convId].length > 0
  if (cache) {
    console.info('当前会话的聊天记录缓存非空')
    return
  }

  const res = await getMessageListApi({ conversationId: convId })
  console.info('获取消息列表成功', res.data)
  arr.list = res.data
  res.data.forEach((messagePcak) => {
    messageStore.addMessageMap(messagePcak.conversationId, {
      conversationId: messagePcak.conversationId,
      senderId: messagePcak.senderId,
      receiverId: messagePcak.receiverId,
      msgType: messagePcak.msgType,
      content: messagePcak.content,
      createTime: messagePcak.createTime
    })
  })
}

const getGroupMemberList = async () => {
  const convId = route.query.conversationId

  console.info('获取群成员列表，会话id:', convId)

  if (!convId) {
    console.info('会话id不存在')
    return
  }

  // 初始化群成员列表
  groupMemberStore.initGroupMemberMap(convId)

  // 再判断缓存（此时 groupMemberMap[convId] 一定是数组，不会报错）
  const cache = groupMemberStore.groupMemberMap[convId].length > 0
  if (cache) {
    console.info('当前会话的群成员缓存非空')
    return
  }

  const res = await getGroupMemberListApi(convId)
  console.info('获取群成员列表成功', res.data)
  res.data.forEach((item) => {
    groupMemberStore.addGroupMember(convId, {
      conversationId: convId,
      userId: item.userId,
      username: item.username,
      role: item.role,
      avatar: item.avatar
    })
  })
}

const messageArr = computed(() => {
  const convId = route.query.conversationId
  // 如果会话ID不存在，或消息列表未初始化，用空数组兜底
  return messageStore.messageMap[convId] || []
})

const friendAvatar = computed(() => conversationStore.getAvatar(route.query.conversationId))
const friendUsername = computed(() => conversationStore.getUsername(route.query.conversationId))
const friendRemark = computed(() => conversationStore.getRemark(route.query.conversationId))
// const groupMemberArr = computed(() => {
//   if (route.query.conversationId && route.query.conversationId.startsWith('g_')) {
//     const convId = route.query.conversationId
//     // 如果会话ID不存在，或群成员列表未初始化，用空数组兜底
//     return groupMemberStore.groupMemberMap[convId] || []
//   }
// })

onMounted(async () => {
  try {
    console.info(
      '聊天页时，好友id' + route.query.friendId + ', 会话id:' + route.query.conversationId
    )
    avatarUrl.value = await window.api.storeGetAvatar()
    userId.value = await window.api.storeGetUserId()
    await getMessageList()
    if (route.query.conversationId.startsWith('g_')) {
      await getGroupMemberList()
    }
    // 所有数据加载完成，允许渲染
    isDataLoaded.value = true
  } catch (error) {
    console.error('初始化失败', error)
    // 即使失败也显示页面，避免白屏
    isDataLoaded.value = true
  }
})

// 监听conversationId变化 - 确保会话切换
watch(
  () => route.query.conversationId,
  async (newConversationId) => {
    try {
      console.info('切换会话，新的会话id', newConversationId)
      await getMessageList()
      if (route.query.conversationId.startsWith('g_')) {
        await getGroupMemberList()
      }
    } catch (error) {
      console.error('加载新会话消息失败', error)
    }
  }
)
</script>

<style scoped>
.chat-count {
  /* 设置宽度和高度，确保有足够空间展示居中效果 */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: #2b3e49;
  -webkit-app-region: no-drag;
}

.chat-title {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ffffff;
  -webkit-app-region: drag;
}

.chat-content {
  flex: 1;
  overflow: hidden;
}

img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
}

.chat-list-left {
  padding: 20px;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.msg {
  display: flex;
  flex-direction: column;
}

.left-name {
  font-size: 14px;
  color: #ffffff;
}

.left-msg {
  font-size: 16px;
  color: black;
}

.chat-list-right {
  padding: 20px;
  display: flex;
  flex-direction: row-reverse;
  gap: 10px;
}

.chat-tool {
  height: 30px;
  display: flex;
  align-items: center;
  border-top: 1px solid #ffffff;
  overflow: hidden;
}

.chat-tool button {
  width: 30px;
  height: 30px;
  margin: 0;
  font-size: 20px;
  background-color: transparent;
  border: none;
}

.chat-input {
  margin: 0 auto;
  height: 120px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
}

.chat-input :deep(.el-textarea__inner) {
  background-color: #2b3e49;
  color: #ffffff;
  box-shadow: none; /* 移除可能的阴影 */
}

.sendButton {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.el-button {
  width: 100px;
  margin: 0 10px 5px 0;
}
</style>
