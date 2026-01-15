<template>
  <div class="chat-count" v-if=isDataLoaded>
    <ChatHeader />
    <div class="chat-content">
      <el-scrollbar ref="scrollbarRef" @scroll="handleScroll" noresize style="height: 100%; width: 100%">
        <div class="chat-message" v-for="message in messageArr" :key="message.id">
          <div class="chat-list-right" v-if="String(message.senderId) === String(userId)">
            <img :src="avatarUrl" class="list-image" />
            <div v-if="message.msgType === 1" class="chat-bubble right-bubble">
              <div> {{ message.content }} </div>
            </div>
            <MessageContentManage v-else v-bind="message" />
          </div>
          <div class="chat-list-left" v-else>
            <img v-if="conversation.type === 0" :src="conversation.avatar" class="list-image" />
            <img v-else :src="groupMemberStore.getGroupMemberAvatar(message.senderId)" class="list-image" />
            <div class="msg">
              <div class="left-name">{{ conversation.remark || conversation.name }}</div>
              <div v-if="message.msgType === 1" class="chat-bubble left-bubble">
                <div> {{ message.content }} </div>
              </div>
              <MessageContentManage v-else v-bind="message" />
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <FilePreviewView v-if="fileInfoList.length > 0" :fileInfoList="fileInfoList" @delete-file="handleDeleteFile" />
    <div class="chat-tool">
      <el-popover placement="top" trigger="click"
        popper-style="width: 300px; height: 300px; display: flex; flex-wrap: wrap; overflow-y: auto; scrollbar-width: none; padding-left: 6px;">
        <div class="emoji-btn" @click="handlerEmoji(emoji.icon)" v-for="(emoji, index) in emojis.list" :key="index"
          :title="emoji.name">
          {{ emoji.icon }}
        </div>
        <template #reference>
          <el-button :icon="Eleme" size="large" square></el-button>
        </template>
      </el-popover>
      <el-upload v-model:file-list="fileList" multiple :limit="3" action="#" :show-file-list="false"
        :auto-upload="false" :on-exceed="handleExceed" :on-change="selectFiles" class="upload-button">
        <el-button :icon="Folder" size="large" square></el-button>
      </el-upload>
      <el-popover placement="top" :disabled="captureImageUrl === ''"
        popper-style="display: flex; margin: 0; padding: 0; justify-content: center; align-items: center;">
        <el-image :src="captureImageUrl" fit="contain" style="width: 150px; height: 150px" />
        <template #reference>
          <el-button :icon="Scissor" size="large" square @click="captureBtn"></el-button>
        </template>
      </el-popover>
      <el-button :icon="VideoCamera" size="large" square></el-button>
    </div>
    <form class="chat-input">
      <el-input v-model="message" type="textarea" :rows="4" resize="none" placeholder="请输入消息" spellcheck="false"
        clearable @keydown.enter="handleEnterMessage" />
    </form>

    <div class="sendButton">
      <el-button type="primary" v-if="conversation.type === 0" @click="sendPrivateMessage">发送</el-button>
      <el-button type="primary" v-else @click="sendGroupMessage">发送</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import emojis from '../../emoji/emoji.js'
import { sendMessageApi } from '../../api/Message'
import { messageInfo } from '../../stores/MessageStore'
import dayjs from 'dayjs'
import { Conversation, initConversation } from '../../types/conversation.ts'
import { WSManager } from '../../utils/websocket.js'
import { conversationInfo } from '../../stores/ConversationStore'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { groupMemberInfo } from '../../stores/GroupMemberStores'
import { getGroupMemberListApi } from '../../api/Conversation'
import { FILE_TYPE_MAP, getFileType } from '../../utils/file/filterFileKind.js'
import MessageContentManage from '../../components/MessageContentManage.vue'
import FilePreviewView from '../../components/FilePreviewView.vue'
import ChatHeader from '../../components/ChatHeader.vue'
import { uploadFile } from '../../utils/file/fileUpload.js'
import { getMessageList, saveSentMessage, saveLoadMessage } from '../../db/dualDB.js'
import { Message } from '../../types/message.ts'
import { Snowflake } from '@theinternetfolks/snowflake'


interface fileBaseInfo {
  fileRaw: File | null
  fileName: string
  fileSize: number
  fileType: number
  fileUrl: string
}

// 消息分页配置
const messagePageInfo = {
  // 分页总数
  pageTotal: 0,
  // 分页页码 第1页，第2页，第3页依次累加
  pageNO: 0,
  // 最大消息的雪花id
  maxMessageId: null,
  // 当前有没有数据
  noData: false
}

const fileUrl = ref('')
const captureImageUrl = ref('')
// 添加数据加载状态标记
const isDataLoaded = ref(false)
let conversation = ref<Conversation>(initConversation())
const route = useRoute()
const message = ref('')
const arr = reactive({ list: [] })
const avatarUrl = ref('')
const userId = ref()
const scrollbarRef = ref()
const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()
let fileInfoList = reactive<fileBaseInfo[]>([])
let fileList = ref<UploadFile[]>([])

const selectFiles = (file: UploadFile | any) => {
  console.info(file.raw)
  console.info('文件名称:', file.name)
  console.info('文件大小:', file.size)
  console.info('文件类型:', file.raw.type)
  console.info('文件URL:', URL.createObjectURL(file.raw))
  const fileType = getFileType(file.raw)
  fileInfoList.push({
    // 包含文件名，文件大小，文件流
    fileRaw: file.raw,
    fileName: file.name,
    fileSize: file.size,
    fileType: fileType,
    fileUrl: URL.createObjectURL(file.raw)
  })
}

// 删除文件预览
const handleDeleteFile = (index: number) => {
  console.info('删除索引为', index, '的文件预览')
  if (index >= 0 && index < fileInfoList.length) {
    fileInfoList.splice(index, 1)
    fileList.value.splice(index, 1)
  }
  console.info('删除后的文件预览列表:', fileInfoList)
  console.log('删除后长度：', fileInfoList.length)
}

// 处理上传文件超出限制
const handleExceed = () => {
  ElMessage.warning('最多只能上传3个文件')
}

// 处理emoji点击事件
const handlerEmoji = (emoji: any) => {
  message.value += emoji
}

// 处理截图按钮点击事件
const captureBtn = () => {
  console.info('截图按钮点击事件');
  (window as any).chatToolApi.openCapture()

    (window as any).chatToolApi.sendImageToMain((savePath: any) => {
      captureImageUrl.value = savePath
    })
}

const handleEnterMessage = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    return
  }
  e.preventDefault()
  if (conversation.value.type === 0) {
    sendPrivateMessage()
  } else {
    sendGroupMessage()
  }
}

// 发送单聊消息
const sendPrivateMessage = async () => {
  // 获取会话id
  const convId = route.query.conversationId as string
  const content = message.value
  // 处理消息类型
  console.info(
    '发送单聊消息 ===> 接收消息用户的ID:',
    conversation.value.targetId,
    '消息内容:',
    content,
    '会话id:',
    convId
  )

  if (fileInfoList.length > 0) {
    for (const file of fileInfoList) {
      console.info(file.fileRaw)
      // 上传文件
      uploadFile(file.fileRaw)
    }
    fileInfoList.length = 0
    fileList.value = []
  }

  if (content === '') {
    return
  }

  // ws发送单聊信息：会话id、接收者id、消息内容
  WSManager.sendMessage(1, 0, {
    conversationId: convId,
    receiverId: conversation.value.targetId,
    content: content
  })

  // 发送截屏
  if (captureImageUrl.value.length > 0) {
    sendApi(captureImageUrl.value, convId, 2)
  }

  if (content !== '') {
    // 发送消息
    sendApi(content, convId, 1)
  }
}

// 发送群聊消息
const sendGroupMessage = async () => {
  // 获取会话id
  const convId = route.query.conversationId as string
  const content = message.value
  console.info('发送群聊消息 ===> 群聊ID:', convId, '消息内容:', content)
  if (content === '') {
    return
  }
  // 处理消息类型
  // ws发送群聊信息：群聊id、消息内容、接收者数组
  console.info('群成员列表:', groupMemberStore.groupMemberMap[convId])
  console.info(
    '群成员ID列表:',
    groupMemberStore.groupMemberMap[convId].map((item) => item.userId)
  )

  WSManager.sendMessage(3, 0, {
    conversationId: convId,
    receiverIds: groupMemberStore.groupMemberMap[convId].map((item) => item.userId),
    content: content
  })

  if (captureImageUrl.value.length > 0) {
    sendApi(captureImageUrl.value, convId, 2)
  }

  if (message.value !== '') {
    sendApi(message.value, convId, 1)
  }
}

const sendApi = (content: string, convId: string, msgType: number) => {
  // 在前端生成发送消息的时间，写入本地数据库和后端MySQL数据库
  const sendTimeStamp = dayjs().valueOf()
  const sendTime = dayjs(sendTimeStamp).format('YYYY-MM-DD HH:mm:ss')

  const snowId = Snowflake.generate()

  const messagePack: Message = {
    id: snowId,
    receiverId: conversation.value.targetId as string,
    conversationId: convId,
    senderId: userId.value,
    msgType: msgType,
    content: content,
    // 0 -发送中  1 -成功  2 -失败
    sendStatus: 0,
    sendTime: sendTime,
    // 0 -未读  1 -已读
    // read_status: 0,
  }

  // 消息列表存入缓存中
  console.info('存入缓存中')
  messageStore.addMessageMap(convId, messagePack)

  // 更新会话最新消息和时间
  conversationStore.setConversationMap(convId, {
    latestMsg: content,
    latestMsgTime: dayjs(sendTimeStamp).format('HH:mm:ss')
  })

  // http发送接收者id、会话id、消息内容
  sendMessageApi(messagePack).then(async (res) => {
    console.info('发送消息成功', res)
    // 清空输入框
    message.value = ''
    // 清空文件预览列表
    fileUrl.value = ''
    // 清空截图
    captureImageUrl.value = ''
    if (res.data) {
      const message = res.data
      // TODO 发送成功，修改发送状态为成功
      message.sendStatus = 1
      // console.info(message)
      // 存入本地数据库
      saveSentMessage(message)
      // 滚动到最底部
      await nextTick()
      scrollToBottom()
    }
  })
}

function scrollToBottom() {
  if (scrollbarRef.value) {
    scrollbarRef.value.setScrollTop(1000000)
  }
}

// 滚动监听
function handleScroll({ scrollTop }: any) {
  // console.info(scrollTop)

  if (scrollTop === 0) {
    console.log('加载更多...');
    loadMessage(conversation.value.id)
  }
}

// const getMessageList = async () => {
//   const convId = route.query.conversationId as string

//   console.info('获取消息列表，会话id:', convId)

//   if (!convId) {
//     console.info('会话id不存在')
//     return
//   }

//   // 此时群聊会话和单聊会话一起存储，只是格式差别比较大
//   messageStore.initMessageMap(convId)

//   // 再判断缓存（此时 messageMap[convId] 一定是数组，不会报错）
//   const cache = messageStore.messageMap[convId].length > 0
//   if (cache) {
//     console.info('当前会话的聊天记录缓存非空: ', messageStore.messageMap[convId])
//     return
//   }

//   const res = await getMessageListApi({ conversationId: convId })
//   console.info('获取消息列表成功', res.data)
//   arr.list = res.data
//   res.data.forEach((messagePcak) => {
//     messageStore.addMessageMap(messagePcak.conversationId, {
//       conversationId: messagePcak.conversationId,
//       senderId: messagePcak.senderId,
//       receiverId: messagePcak.receiverId,
//       msgType: messagePcak.msgType,
//       content: messagePcak.content,
//       sendTime: messagePcak.sendTime
//     })
//   })
// }

const getGroupMemberList = async () => {
  const convId = route.query.conversationId as string

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
    console.info('当前会话的群成员缓存非空: ', groupMemberStore.groupMemberMap[convId])
    return
  }

  const res = await getGroupMemberListApi(convId)
  console.info('获取群成员列表成功', res.data)
  res.data.forEach((item: any) => {
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

const loadMessage = async (newConversationId: any) => {
  const messageList = await getMessageList(newConversationId, messagePageInfo)
  // 本地数据库没数据，服务端数据库仍有数据时
  const hasServerData = messageList.length > 0 && messagePageInfo.noData;

  if (messageList.length > 0) {
    // 加入pinia缓存
    messageList.forEach((messagePcak: Message) => {
      messageStore.loadMessageMap(messagePcak.conversationId, messagePcak)
    })
  } else {
    // TODO 展示查询结束的消息
    console.info('数据查询完毕')

  }

  if (hasServerData) {
    // 将从服务端查来的数据写入本地数据库
    saveLoadMessage(messageList)
  }

}

const messageArr = computed(() => {
  const convId = route.query.conversationId as string
  console.info(convId)
  console.info(messageStore.messageMap[convId])
  // 如果会话ID不存在，或消息列表未初始化，用空数组兜底
  return messageStore.messageMap[convId] || []
})

// 监听conversationId变化 - 确保会话切换
watch(
  // 监听会话ID变化
  () => route.query.conversationId,
  async (newConversationId, oldConversationId) => {
    try {
      console.info('切换会话，新的会话id:', newConversationId, '旧的会话id:', oldConversationId)

      // 进入新会话时重置
      messagePageInfo.pageTotal = 0
      messagePageInfo.pageNO = 0
      messagePageInfo.maxMessageId = null
      messagePageInfo.noData = false

      console.info('重置之后的分页配置信息', messagePageInfo)

      // 初始化会话信息
      conversation.value = conversationStore.conversationMap[newConversationId as string]

      // 清空文件预览列表
      fileInfoList.length = 0
      fileList.value = []

      if (!isDataLoaded.value && oldConversationId === undefined) {
        // 说明是第一次加载，更新用户的头像和id
        console.info('第一次加载，更新用户的头像和id')
        avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
        userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')
      }

      await loadMessage(newConversationId)

      // 判断当前会话是单聊还是群聊
      if (conversation.value.type === 1) {
        // 是群聊，获取群成员列表，获取用户的头像等信息
        await getGroupMemberList()
      }

      // 所有数据加载完成，允许渲染
      isDataLoaded.value = true

      await nextTick()
      scrollToBottom()
    } catch (error) {
      console.error('加载新会话消息失败', error)
      isDataLoaded.value = true
    }
  },
  { immediate: true }
)

// 组件卸载时重置
onUnmounted(() => {
  messagePageInfo.pageTotal = 0
  messagePageInfo.pageNO = 0
  messagePageInfo.maxMessageId = null
  messagePageInfo.noData = false
})
</script>

<style scoped>
.chat-count {
  /* 设置宽度和高度，确保有足够空间展示居中效果 */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: rgba(28, 38, 50, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  -webkit-app-region: no-drag;
}

/* 2. 修改抽屉头部*/
:deep(.download-drawer .el-drawer__header) {
  background-color: #e8f4ff;
  /* 头部背景 */
  padding: 15px 20px;
  /* 头部内边距 */
  border-bottom: 1px solid #dcdfe6;
  /* 头部下边框 */
}

/* 3. 修改抽屉内容区 */
:deep(.download-drawer .el-drawer__body) {
  padding: 0;
  /* 内容区内边距 */
  background-color: #f8f9fa;
  /* 内容区背景 */
  height: calc(100% - 60px);
  /* 自适应高度（减去头部高度） */
  overflow-y: auto;
  /* 内容超出滚动 */
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
  border-top: 1px solid rgba(3, 32, 120, 0.5);
  overflow: hidden;
}

.chat-tool button {
  width: 30px;
  height: 30px;
  margin: 0;
  font-size: 20px;
  background-color: transparent;
  border: none;
  color: rgba(240, 240, 240, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-tool button:hover {
  color: rgba(66, 153, 225, 0.9);
  text-shadow: 0 0 6px rgba(66, 153, 225, 0.3);
}

.upload-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
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
  background-color: rgba(28, 38, 50, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #f0f0f0;
  box-shadow: none;
  border: 1px solid rgba(66, 153, 225, 0.2);

  &::placeholder {
    color: rgba(240, 240, 240, 0.5);
  }
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

:deep(.el-button--primary) {
  background: rgba(66, 153, 225, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  border-radius: 6px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.08);
  color: #f0f0f0;
  font-size: 14px;
  padding: 8px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus) {
  background: rgba(66, 153, 225, 0.3);
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 3px rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

:deep(.el-button--primary:active) {
  transform: translateY(0);
  background: rgba(66, 153, 225, 0.15);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.el-button {
  width: 100px;
  margin: 0 10px 5px 0;
}

/* 聊天气泡样式 */
.chat-bubble {
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 400px;
  word-break: break-all;
  /* 定位三角箭头 */
  position: relative;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* 左侧好友气泡 */
.left-bubble {
  background: rgba(45, 55, 70, 0.85);
  color: #f0f0f0;
  /* 左侧气泡左下角无圆角，贴合箭头 */
  border-bottom-left-radius: 0;
  border: 1px solid rgba(66, 153, 225, 0.1);
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
  border-right: 8px solid rgba(45, 55, 70, 0.85);
  border-bottom: 8px solid transparent;
}

/* 右侧自己的气泡 */
.right-bubble {
  background: rgba(66, 153, 225, 0.35);
  color: #ffffff;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(66, 153, 225, 0.2);
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
  border-left: 8px solid rgba(66, 153, 225, 0.35);
  border-bottom: 8px solid transparent;
}
</style>
