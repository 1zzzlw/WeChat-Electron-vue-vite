<template>
  <div class="chat-count" v-if="isDataLoaded">
    <div class="chat-title">
      {{ friendRemark === '' ? friendUsername : friendRemark }}
    </div>
    <div class="chat-content">
      <el-scrollbar ref="scrollbarRef">
        <div class="chat-message" v-for="(message, index) in messageArr" :key="index">
          <div
            class="chat-list-left"
            v-if="String(message.senderId) === String(route.query.friendId)"
          >
            <img :src="friendAvatar" class="list-image" />
            <div class="msg">
              <div class="left-name" v-if="message.remark === ''">{{ friendUsername }}</div>
              <div class="left-name" v-else>{{ friendRemark }}</div>
              <div class="chat-bubble left-bubble" v-html="formatMsg(message.content)"></div>
            </div>
          </div>
          <div class="chat-list-right" v-else-if="String(message.senderId) === String(userId)">
            <img :src="avatarUrl" class="list-image" />
            <div class="chat-bubble right-bubble" v-html="formatMsg(message.content)"></div>
          </div>
          <div class="chat-list-left" v-else>
            <img
              :src="groupMemberStore.getGroupMemberAvatar(message.senderId)"
              class="list-image"
            />
            <div class="chat-bubble right-bubble" v-html="formatMsg(message.content)"></div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="chat-tool">
      <el-popover
        placement="top"
        trigger="click"
        popper-style="width: 300px; height: 300px; display: flex; flex-wrap: wrap; overflow-y: auto; scrollbar-width: none; padding-left: 6px;"
      >
        <div
          class="emoji-btn"
          @click="handlerEmoji(emoji.icon)"
          v-for="(emoji, index) in emojis.list"
          :key="index"
          :title="emoji.name"
        >
          {{ emoji.icon }}
        </div>
        <template #reference>
          <el-button :icon="Eleme" size="large" square></el-button>
        </template>
      </el-popover>
      <el-button :icon="Folder" size="large" square></el-button>
      <el-popover
        placement="top"
        :disabled="imageUrl === ''"
        popper-style="display: flex; margin: 0; padding: 0; justify-content: center; align-items: center;"
      >
        <el-image :src="imageUrl" fit="contain" style="width: 150px; height: 150px" />
        <template #reference>
          <el-button :icon="Scissor" size="large" square @click="captureBtn"></el-button>
        </template>
      </el-popover>
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import emojis from '../../emoji/emoji.js'
import { getMessageListApi, sendMessageApi } from '../../api/Message'
import { messageInfo } from '../../stores/MessageStore'
import dayjs from 'dayjs'
import { WSManager } from '../../utils/websocket.js'
import { conversationInfo } from '../../stores/ConversationStore'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'
import { groupMemberInfo } from '../../stores/GroupMemberStores'
import { getGroupMemberListApi } from '../../api/Conversation'

const imageUrl = ref('')
// 添加数据加载状态标记
const isDataLoaded = ref(false)
const route = useRoute()
const message = ref('')
const arr = reactive({ list: [] })
const avatarUrl = ref('')
const userId = ref()
const scrollbarRef = ref(null)

const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()

const formatMsg = (msg) => {
  if (!msg) return '' // 处理空消息
  let result = msg
  // 1. 匹配@用户名，高亮显示（原有功能优化样式）
  result = result.replace(
    /@(\w+)/g,
    '<span style="color: #409eff; font-weight: 600; background: #ecf5ff; padding: 0 4px; border-radius: 2px;">@$1</span>'
  )
  // 2. 匹配图片路径（本地/网络），转为img标签
  result = result.replace(/\S+\.(png|jpg|jpeg|gif|webp)/gi, (imgPath) => {
    // 处理Windows本地路径的反斜杠
    const src = imgPath.replace(/\\/g, '/')
    return `<img src="${src}" style="max-width: 300px; max-height: 200px; display: block; margin: 5px 0; border-radius: 4px;" alt="聊天图片">`
  })
  // 3. 给{{}}变量添加样式（如需高亮显示）
  result = result.replace(
    /\{\{(\w+)\}\}/g,
    '<span style="color: #e6a23c; font-weight: 600;">{{$1}}</span>'
  )
  return result
}

const handlerEmoji = (emoji) => {
  message.value += emoji
}

const captureBtn = () => {
  console.info('截图按钮点击事件')
  window.chatToolApi.openCapture()

  window.chatToolApi.sendImageToMain((savePath) => {
    imageUrl.value = savePath
  })
}

const sendMessage = async () => {
  if (imageUrl.value.length > 0) {
    sendApi(imageUrl.value)
  }

  if (message.value !== '') {
    sendApi(message.value)
  }
}

const sendApi = (data) => {
  console.info(
    '接收消息用户的ID:',
    route.query.friendId,
    '消息内容:',
    data,
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
      content: data
    })
  } else {
    // ws发送单聊信息：会话id、接收者id、消息内容
    WSManager.sendMessage(1, 0, {
      conversationId: convId,
      receiverId: route.query.friendId,
      content: data
    })
  }

  // http发送接收者id、会话id、消息内容
  sendMessageApi({
    receiverId: route.query.friendId,
    conversationId: convId,
    content: data
  }).then((res) => {
    console.info('发送消息成功', res)
    message.value = ''
    imageUrl.value = ''
    if (res.data) {
      messageStore.addMessageMap(convId, res.data)
      conversationStore.setConversationMap(convId, {
        latestMsg: res.data.content,
        latestMsgTime: dayjs(res.data.sendTime).format('HH:mm')
      })
    }
  })
}

function scrollToBottom() {
  if (scrollbarRef.value) {
    scrollbarRef.value.setScrollTop(999999)
  }
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
    // 缓存群成员头像，方便后续使用
    groupMemberStore.addGroupMemberAvatar(item.userId, item.avatar)
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
    await nextTick()
    scrollToBottom()
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
      await nextTick()
      scrollToBottom()
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

:deep(.my-custom-popover) {
  width: 300px;
  height: 300px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.emoji-btn {
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn:hover {
  background-color: rgba(255, 255, 255, 0.18);
  transform: scale(1.15);
  cursor: pointer;
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

/* 核心：聊天气泡样式（带三角箭头） */
.chat-bubble {
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 400px;
  word-break: break-all;
  position: relative; /* 用于定位三角箭头 */
}
/* 左侧好友气泡 */
.left-bubble {
  background: #f1f1f1;
  border-bottom-left-radius: 0; /* 左侧气泡左下角无圆角，贴合箭头 */
}
/* 左侧箭头 */
.left-bubble::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 10px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-right: 8px solid #f1f1f1;
  border-bottom: 8px solid transparent;
}
/* 右侧自己的气泡 */
.right-bubble {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 0; /* 右侧气泡右下角无圆角，贴合箭头 */
}
/* 右侧箭头 */
.right-bubble::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 10px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-left: 8px solid #409eff;
  border-bottom: 8px solid transparent;
}
/* 气泡内图片样式 */
.chat-bubble img {
  max-width: 300px;
  max-height: 200px;
  display: block;
  margin: 5px 0;
  border-radius: 4px;
}
</style>
