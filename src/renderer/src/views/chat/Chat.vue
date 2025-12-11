<template>
  <div class="chat-count" v-if="isDataLoaded">
    <div class="chat-title">
      {{ friendRemark || friendUsername }}
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
              <div class="left-name">{{ friendRemark || friendUsername }}</div>
              <div class="chat-bubble left-bubble">
                <MessageContentManage
                  :msgType="message.msgType"
                  :content="message.content"
                  :fileUrl="message.content"
                />
              </div>
            </div>
          </div>
          <div class="chat-list-right" v-else-if="String(message.senderId) === String(userId)">
            <img :src="avatarUrl" class="list-image" />
            <div class="chat-bubble right-bubble">
              <MessageContentManage
                :msgType="message.msgType"
                :content="message.content"
                :fileUrl="message.content"
              />
            </div>
          </div>
          <div class="chat-list-left" v-else>
            <img
              :src="groupMemberStore.getGroupMemberAvatar(message.senderId)"
              class="list-image"
            />
            <div class="chat-bubble left-bubble">
              <MessageContentManage
                :msgType="message.msgType"
                :content="message.content"
                :fileUrl="message.content"
              />
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <FilePreviewView
      v-if="fileInfoList.length > 0"
      :fileInfoList="fileInfoList"
      @delete-file="handleDeleteFile"
    />
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
      <el-upload
        v-model:file-list="fileList"
        multiple
        :limit="3"
        action="#"
        :show-file-list="false"
        :auto-upload="false"
        :on-exceed="handleExceed"
        :on-change="selectFiles"
        class="upload-button"
      >
        <el-button :icon="Folder" size="large" square></el-button>
      </el-upload>
      <el-popover
        placement="top"
        :disabled="captureImageUrl === ''"
        popper-style="display: flex; margin: 0; padding: 0; justify-content: center; align-items: center;"
      >
        <el-image :src="captureImageUrl" fit="contain" style="width: 150px; height: 150px" />
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
      <el-button type="success" v-if="chatType" @click="sendPrivateMessage">发送</el-button>
      <el-button type="success" v-else @click="sendGroupMessage">发送</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import emojis from '../../emoji/emoji.js'
import {
  getMessageListApi,
  sendMessageApi,
  uploadFileApi,
  checkUploadedApi
} from '../../api/Message'
import { messageInfo } from '../../stores/MessageStore'
import dayjs from 'dayjs'
import { WSManager } from '../../utils/websocket.js'
import { conversationInfo } from '../../stores/ConversationStore'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { groupMemberInfo } from '../../stores/GroupMemberStores'
import { getGroupMemberListApi } from '../../api/Conversation'
import { FILE_TYPE_MAP, getFileType } from '../../utils/filterFileKind.js'
import MessageContentManage from '../../components/MessageContentManage.vue'
import FilePreviewView from '../../components/FilePreviewView.vue'
import { fileChunkInfo } from '../../stores/FileChunkInfoStore'
import { cutFile } from '../../utils/cutFile.js'

interface fileBaseInfo {
  fileRaw: File | null
  fileName: string
  fileSize: number | string
  fileType: number
}

const fileUrl = ref('')
const captureImageUrl = ref('')
// 添加数据加载状态标记
const isDataLoaded = ref(false)
// true为单聊，false为群聊
const chatType = ref(true)
const route = useRoute()
const message = ref('')
const arr = reactive({ list: [] })
const avatarUrl = ref('')
const userId = ref()
const scrollbarRef = ref(null)
const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()
const fileChunkInfoStore = fileChunkInfo()
let fileInfoList = reactive<fileBaseInfo[]>([])
let fileList = ref<UploadFile[]>([])

const selectFiles = (file: UploadFile) => {
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
    fileType: fileType
  })
}

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
const handlerEmoji = (emoji) => {
  message.value += emoji
}

// 处理截图按钮点击事件
const captureBtn = () => {
  console.info('截图按钮点击事件')
  window.chatToolApi.openCapture()

  window.chatToolApi.sendImageToMain((savePath) => {
    captureImageUrl.value = savePath
  })
}

// 发送单聊消息
const sendPrivateMessage = async () => {
  // 获取会话id
  const convId = route.query.conversationId as string
  const content = message.value
  // 处理消息类型
  console.info(
    '发送单聊消息 ===> 接收消息用户的ID:',
    route.query.friendId,
    '消息内容:',
    content,
    '会话id:',
    convId
  )
  if (fileInfoList.length > 0) {
    for (const file of fileInfoList) {
      console.info('文件类型:', file.fileType, '文件类型名称:', FILE_TYPE_MAP.get(file.fileType))
      // 跟随日期生成文件夹，并复制选择发送的文件到指定目录
      // const arrayBuffer = await file.fileRaw.arrayBuffer()
      // const filePath = await window.chatToolApi.createFile(arrayBuffer, file.fileName)

      // 发送请求获取上传成功的分片索引列表
      const res = await checkUploadedApi({
        filename: file.fileName
      })

      console.info('上传成功的分片索引列表:', res.data)

      const uploadedChunkIndexList = res.data

      // 对文件进行切片
      const chunks = await cutFile(file.fileRaw, uploadedChunkIndexList)

      console.info('文件切片结果:', chunks)

      for (let index = 0; index < chunks.length; index++) {
        const { chunkBlob, chunkIndex, chunkHash, filename, isUploaded } = chunks[index]

        if (isUploaded) {
          // 分片已上传，跳过
          console.info(`分片 ${chunkIndex} 已上传，跳过`)
          continue
        }

        const fromData = new FormData()

        // 检查分片是否已上传
        // if (fileChunkInfoStore.getIsUploaded(chunkIndex)) {
        //   console.info(`分片 ${chunkIndex} 已上传，跳过`)
        //   continue
        // }

        fromData.append('chunkBlob', chunkBlob)
        fromData.append('chunkIndex', chunkIndex)
        fromData.append('chunkHash', chunkHash)
        fromData.append('filename', filename)
        fromData.append('isUploaded', isUploaded)

        // 模拟失败：假设第 2 个和第 5 个分块失败
        // if (chunkIndex === 2 || chunkIndex === 5) {
        //   console.warn(`模拟上传失败: chunk ${chunkIndex}`)
        //   return // 不标记 isUploaded
        // }

        // 上传文件
        uploadFileApi(fromData)
          .then((res) => {
            console.info(`上传第 ${chunkIndex} 个分片成功:`, res.data)
            // fileChunkInfoStore.addUploadSuccess(chunkIndex)
          })
          .catch((err) => {
            console.error(`上传第 ${chunkIndex} 个分片失败`, err)
          })
      }

      // sendApi(FILE_TYPE_MAP.get(file.fileType), convId, file.fileType)
      // TODO 暂时让后端MySQL存储文件路径，后期使用SQLite3存储本地文件路径信息
      // sendApi(filePath, convId, file.fileType)
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
    receiverId: route.query.friendId,
    content: content
  })

  if (captureImageUrl.value.length > 0) {
    sendApi(captureImageUrl.value, convId, 2)
  }

  if (content !== '') {
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
  // const convId = route.query.conversationId
  // if (convId.startsWith('g_')) {
  //   // ws发送群聊信息：群聊id、消息内容、接收者数组
  //   console.info('群成员列表:', groupMemberStore.groupMemberMap[convId])
  //   console.info(
  //     '群成员ID列表:',
  //     groupMemberStore.groupMemberMap[convId].map((item) => item.userId)
  //   )
  //   WSManager.sendMessage(3, 0, {
  //     conversationId: convId,
  //     receiverIds: groupMemberStore.groupMemberMap[convId].map((item) => item.userId),
  //     content: content
  //   })
  // } else {
  //   // ws发送单聊信息：会话id、接收者id、消息内容
  //   WSManager.sendMessage(1, 0, {
  //     conversationId: convId,
  //     receiverId: route.query.friendId,
  //     content: content
  //   })
  // }

  // http发送接收者id、会话id、消息内容
  sendMessageApi({
    receiverId: route.query.friendId,
    conversationId: convId,
    content: content,
    msgType: msgType
  }).then((res) => {
    console.info('发送消息成功', res)
    // 清空输入框
    message.value = ''
    fileUrl.value = ''
    captureImageUrl.value = ''
    if (res.data) {
      // 聊天记录缓存新增数据
      messageStore.addMessageMap(convId, res.data)
      if (chatType.value) {
        // 单聊会话缓存更新最新消息
        conversationStore.setConversationMap(convId, {
          latestMsg: res.data.content,
          latestMsgTime: dayjs(res.data.sendTime).format('HH:mm')
        })
      } else {
        // 群聊会话缓存更新最新消息
        conversationStore.setGroupConversationMap(convId, {
          latestMsg: res.data.content,
          latestMsgTime: dayjs(res.data.sendTime).format('HH:mm')
        })
      }
      if (res.data.msgType === 2) {
        // TODO 暂时通过MySQL传来的图片路径展示
      }
      // 滚动到最底部
      nextTick()
      scrollToBottom()
    }
  })
}

function scrollToBottom() {
  if (scrollbarRef.value) {
    scrollbarRef.value.setScrollTop(999999)
  }
}

const getMessageList = async () => {
  const convId = route.query.conversationId as string

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
      sendTime: messagePcak.sendTime
    })
  })
}

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
  const convId = route.query.conversationId as string
  // 如果会话ID不存在，或消息列表未初始化，用空数组兜底
  return messageStore.messageMap[convId] || []
})

const friendAvatar = computed(() =>
  conversationStore.getAvatar(route.query.conversationId as string)
)
const friendUsername = computed(() =>
  conversationStore.getUsername(route.query.conversationId as string)
)
const friendRemark = computed(() =>
  conversationStore.getRemark(route.query.conversationId as string)
)
// const groupMemberArr = computed(() => {
//   if (route.query.conversationId && route.query.conversationId.startsWith('g_')) {
//     const convId = route.query.conversationId
//     // 如果会话ID不存在，或群成员列表未初始化，用空数组兜底
//     return groupMemberStore.groupMemberMap[convId] || []
//   }
// })

// 监听conversationId变化 - 确保会话切换
watch(
  // 监听会话ID变化
  () => route.query.conversationId,
  async (newConversationId, oldConversationId) => {
    try {
      console.info('切换会话，新的会话id:', newConversationId, '旧的会话id:', oldConversationId)

      // 清空文件预览列表
      fileInfoList.length = 0
      fileList.value = []

      if (!isDataLoaded.value && oldConversationId === undefined) {
        // 说明是第一次加载，更新用户的头像和id
        console.info('第一次加载，更新用户的头像和id')
        avatarUrl.value = await window.api.storeGetUserInfo('avatar')
        userId.value = await window.api.storeGetUserInfo('userId')
      }

      // 判断当前会话是单聊还是群聊
      await getMessageList()
      // 默认设置为单聊
      chatType.value = true
      if (newConversationId.startsWith('g_')) {
        // 是群聊，获取群成员列表，获取用户的头像等信息
        await getGroupMemberList()
        // 将会话类型设置为群聊
        chatType.value = false
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

// onMounted(async () => {
//   try {
//     console.info(
//       '聊天页时，好友id' + route.query.friendId + ', 会话id:' + route.query.conversationId
//     )
//     avatarUrl.value = await window.api.storeGetAvatar()
//     userId.value = await window.api.storeGetUserId()
//
//     await getMessageList()
//     if (route.query.conversationId.startsWith('g_')) {
//       await getGroupMemberList()
//     }
//
//     // 所有数据加载完成，允许渲染
//     isDataLoaded.value = true
//     await nextTick()
//     scrollToBottom()
//   } catch (error) {
//     console.error('初始化失败', error)
//     // 即使失败也显示页面，避免白屏
//     isDataLoaded.value = true
//   }
// })
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

/* 聊天气泡样式 */
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
