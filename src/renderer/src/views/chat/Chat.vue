<template>
  <div class="chat-count">
    <ChatHeader :conversation="conversation" />
    <div class="chat-content">
      <el-scrollbar ref="scrollbarRef" @scroll="handleScroll" noresize style="height: 100%; width: 100%">
        <div class="chat-message" v-for="(message, index) in messageArr" :key="message.id" :id="`message${message.id}`">
          <!-- 展示时间 -->
          <ChatMessageTime :dataTime="message.sendTime"
            v-if="index > 0 && dayjs(message.sendTime).diff(dayjs(messageArr[index - 1].sendTime)) >= 300000">
          </ChatMessageTime>
          <!-- 展示系统消息 -->
          <ChatMessageSystem v-if="message.msgType === 99" :message="message">
          </ChatMessageSystem>
          <div v-if="String(message.senderId) === String(userId) && message.msgType !== 99">
            <div class="chat-list-right">
              <img :src="avatarUrl" class="list-image" />
              <ContextMenu :menu="[
                { label: '复制' },
                { divider: true },
                { label: '收藏' },
                { label: '撤回' },
                { label: '引用' },
                { divider: true },
                { label: '删除' },
              ]"
                @select="(item) => handleChoice(item, message.id, message.content, message.msgType, message.remoteUrl, message.fileName)">
                <div v-if="message.msgType === 1" class="chat-bubble right-bubble">
                  <div> {{ message.content }} </div>
                </div>
                <MessageContentManage v-else v-bind="message" :isUpload="true" />
                <div class="icon send-load" v-if="message.sendStatus === 0">
                  <el-icon>
                    <Loading />
                  </el-icon>
                </div>
                <div class="icon send-failed" v-if="message.sendStatus === 2">
                  <el-icon>
                    <WarningFilled />
                  </el-icon>
                </div>
              </ContextMenu>
            </div>
          </div>
          <div v-else-if="message.msgType !== 99">
            <div class="chat-list-left">
              <img v-if="conversation.type === 0" :src="conversation.avatar" class="list-image" />
              <img v-else :src="groupMemberStore.getGroupMemberAvatar(message.senderId)" class="list-image" />
              <div class="msg">
                <div v-if="conversation.type === 0" class="left-name">{{ conversation.remark || conversation.name }}
                </div>
                <ContextMenu :menu="[
                  { label: '复制' },
                  { divider: true },
                  { label: '收藏' },
                  { label: '引用' },
                  { divider: true },
                  { label: '删除' },
                ]"
                  @select="(item) => handleChoice(item, message.id, message.content, message.msgType, message.remoteUrl, message.fileName)">
                  <div v-if="message.msgType === 1" class="chat-bubble left-bubble">
                    <div> {{ message.content }} </div>
                  </div>
                  <MessageContentManage v-else v-bind="message" :isUpload="false" />
                </ContextMenu>
              </div>
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
      <el-button :icon="Folder" size="large" square @click="selectFile"></el-button>
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
import { computed, nextTick, ref, watch, onUnmounted, toRaw } from 'vue'
import { useRoute } from 'vue-router'
import emojis from '../../emoji/emoji.js'
import { sendMessageApi, recallMessageApi } from '../../api/Message'
import { messageInfo } from '../../stores/modules/MessageStore.ts'
import dayjs from 'dayjs'
import { Conversation, initConversation } from '../../types/conversation.ts'
import { FileBaseInfo, FileUploadStatusInfo, statusMap } from '../../types/fileBaseInfo.ts'
import { conversationInfo } from '../../stores/modules/ConversationStore.ts'
import { fileStatusListInfo } from '../../stores/modules/FileStatusInfoStore.ts'
import { Eleme, Folder, Scissor, VideoCamera } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { groupMemberInfo } from '../../stores/modules/GroupMemberStores.ts'
import { getGroupMemberListApi } from '../../api/Conversation'
import MessageContentManage from '../../components/MessageContentManage.vue'
import FilePreviewView from '../../components/FilePreviewView.vue'
import ChatHeader from '../../components/ChatHeader.vue'
import { getMessageList, saveSentMessage, saveLoadMessage, updateConversation, updateMessage } from '../../db/dualDB.js'
import { Message } from '../../types/message.ts'
import { Snowflake } from '@theinternetfolks/snowflake'
import ContextMenu from '../../components/ContextMenu.vue'
import ChatMessageTime from '../../components/ChatMessageTime.vue'
import ChatMessageSystem from '../../components/ChatMessageSystem.vue'
import { createSystemMessagePack, createContentJson } from '../../utils/systemMessageUtil.js'
import { SystemMsgSubType } from '../../utils/constants.js'
import { deleteMessage } from '../../db/dualDB.js'

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

interface SendConfig {
  convId: string
  targetId: string
  getReceiverIds: () => string[]
}

const fileUrl = ref('')
const captureImageUrl = ref('')
let conversation = ref<Conversation>(initConversation())
const route = useRoute()
const message = ref('')
const avatarUrl = ref('')
const userId = ref()
const scrollbarRef = ref()
const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()
const fileStatusListInfoStore = fileStatusListInfo()
// 主要用于展示预览文件
let fileInfoList = ref<FileBaseInfo[]>([])

// 选择文件
const selectFile = async () => {
  // 获取文件的信息
  const file = await (window as any).uploadFileApi.selectFile('uploadFile')
  console.log(file)
  if (!file) {
    return
  }
  if (fileInfoList.value.length >= 3) {
    ElMessage.error('最多3个文件')
    return
  }
  // 预览文件展示的集合
  fileInfoList.value.push({
    base64: file.base64,
    fileId: file.fileId,
    fileName: file.fileName,
    fileSize: file.fileSize,
    fileType: file.fileType,
    content: file.content,
    localPath: file.localPath,
    remotePath: '',
  })
}

// 删除预览框中的文件
const handleDeleteFile = (fileId: string) => {
  console.info('删除索引为', fileId, '的文件预览')
  fileInfoList.value = fileInfoList.value.filter(file => file.fileId != fileId)
  console.info('删除后的文件预览列表:', fileInfoList)
}

// 处理emoji点击事件
const handlerEmoji = (emoji: any) => {
  message.value += emoji
}

// 处理截图按钮点击事件
const captureBtn = () => {
  console.info('截图按钮点击事件');
  (window as any).chatToolApi.openCapture();

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

const sendMessage = async () => {
  const convId = route.query.conversationId as string
  const content = message.value
  const isPrivate = conversation.value.type === 0
  const receiverId = isPrivate ? conversation.value.targetId : convId

  // 获取接收者ID列表
  const receiverIds = isPrivate ? [] : (
    groupMemberStore.groupMemberMap[convId]
      ?.filter((item) => item.userId !== userId.value)
      .map((item) => item.userId) || []
  )

  // ---------------------- 处理文件消息 ----------------------
  if (fileInfoList.value.length > 0) {
    for (const file of fileInfoList.value) {
      // 上传文件
      const { minioFilePath, chunkCount } = await (window as any).uploadFileApi.uploadFile(toRaw(file))
      file.remotePath = minioFilePath

      // 存文件上传状态
      const fileStatusInfo: FileUploadStatusInfo = {
        fileId: file.fileId,
        chunkCount,
        uploadStatus: statusMap.uploading.value,
        uploadProgress: 0,
        uploadSpeed: 0,
        pause: false
      }
      fileStatusListInfoStore.addFileUploadUpdateInfo(file.fileId, fileStatusInfo)

      // 打包消息
      const messagePack = createMessagePack(receiverId as string, convId, file.fileType, file.content, file)
      messagePack.receiverIds = receiverIds as string[]
      messageStore.addFileMessage(file.fileId, messagePack)

      // 文件消息：先发 HTTP
      sendApi(messagePack)
    }
    fileInfoList.value.length = 0
  }

  // ---------------------- 处理文本消息 ----------------------
  if (content !== '') {
    message.value = ''
    const messagePack = createMessagePack(receiverId as string, convId, 1, content, null)

    // 文本消息：直接走 store
    messageStore.sendMessage(messagePack, convId, receiverIds as string[])

    updateConversationInfo(messagePack)

    // 滚动到底部
    await nextTick()
    scrollToBottom()
  }
}

// 发送单聊消息
const sendPrivateMessage = async () => {
  await sendMessage()
}

// 发送群聊消息
const sendGroupMessage = async () => {
  await sendMessage()
}

const sendApi = (messagePack: Message) => {
  console.log(messagePack)
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
      console.log(message)

      // 消息列表存入缓存中
      console.info('存入缓存中')

      messagePack.remoteUrl = message.remoteUrl

      messageStore.addMessageMap(messagePack.conversationId, messagePack)

      // 更新会话最新消息和时间
      conversationStore.setConversationMap(messagePack.conversationId, {
        latestMsg: messagePack.content,
        latestMsgTime: dayjs(messagePack.sendTime).format('HH:mm:ss')
      })

      if (message.msgType === 1) {
        // 文本消息，直接修改状态为发送成功
        message.sendStatus = 1
      } else {
        // 文件消息，需要等到合并成功的时候才将状态修改为1
        message.sendStatus = 0
        // 文件消息需要添加远程路径到缓存中
        messageStore.addFileUrl(message.fileId, message.remoteUrl)
      }
      // 存入本地数据库
      // saveSentMessage(message)
      // 更新本地会话列表的最新消息
      const condition = {
        id: messagePack.conversationId
      }
      const data = {
        latestMsg: messagePack.content,
        latestMsgTime: messagePack.sendTime
      }
      updateConversation(condition, data)
      // 滚动到最底部
      await nextTick()
      scrollToBottom()
    }
  })
}

const updateConversationInfo = (messagePack: Message) => {
  // 更新本地会话列表的最新消息
  const condition = {
    id: messagePack.conversationId
  }
  const data = {
    latestMsg: messagePack.content,
    latestMsgTime: messagePack.sendTime
  }
  updateConversation(condition, data)
  // 更新会话最新消息和时间
  conversationStore.setConversationMap(messagePack.conversationId, {
    latestMsg: messagePack.content,
    latestMsgTime: dayjs(messagePack.sendTime).format('HH:mm:ss')
  })
}

// 生成消息的包装
function createMessagePack(receiverId: string | number, convId: string, msgType: number, content: string, file: any) {
  let fileId = ''
  let fileName = ''
  let fileSize = 0
  let localPath = ''
  let base64 = ''
  let remotePath = ''
  if (file != null) {
    ({ fileId, fileName, fileSize, localPath, base64, remotePath } = file)
  }
  // 在前端生成发送消息的时间，写入本地数据库和后端MySQL数据库
  const sendTimeStamp = dayjs().valueOf()
  const sendTime = dayjs(sendTimeStamp).format('YYYY-MM-DD HH:mm:ss')

  const snowId = Snowflake.generate()

  const messagePack: Message = {
    id: snowId,
    senderId: userId.value,
    conversationId: convId,
    receiverId: receiverId,
    msgType: msgType,
    content: content,
    // 0 -发送中  1 -成功  2 -失败
    sendStatus: 0,
    // 0 -未读  1 -已读
    // read_status: 0,
    sendTime: sendTime,
    fileId: fileId,
    fileName: fileName,
    fileSize: fileSize,
    localPath: localPath,
    previewBase64: base64,
    remotePath: remotePath
  }

  return messagePack
}

const handleChoice = async (item: any, messageId: string, messageContent: string, msgType: number, remoteUrl: any, fileName: any) => {
  switch (item.label) {
    case '复制': {
      (window as any).chatToolApi.copyFile(messageContent, remoteUrl, msgType, fileName)
      break
    }
    case '收藏': {

      break
    }
    case '撤回': {
      const convId = conversation.value.id as string
      const isGroup = conversation.value.type === 1

      // HTTP 撤回
      const res: any = await recallMessageApi({
        conversationId: convId,
        messageId: messageId
      })
      if (res?.code !== 1) {
        ElMessage.error('撤回失败')
        break
      }

      // 本地删除被撤回的消息
      messageStore.deleteMessage(convId, messageId);

      // 本地数据库删除撤回的消息
      deleteMessage(convId, messageId)

      // 组装 receiverIds（群聊发给群成员；单聊发给对方）
      const receiverIds = isGroup
        ? (groupMemberStore.groupMemberMap[convId]
          ?.filter((m: any) => String(m.userId) !== String(userId.value))
          .map((m: any) => String(m.userId)) || [])
        : [String(conversation.value.targetId)]

      // 构造系统消息
      const myName = await (window as any).userInfoApi.storeGetUserInfo('username')

      /**
       * 系统消息内容
       * 撤回人姓名
       * 会话id
       * 对方名称
       * 撤回消息Id
       */
      const content = createContentJson('{name} 撤回了一条消息', myName, conversation.value.id, conversation.value.name, messageId)

      // receiverId：单聊存对方ID，群聊存群ID
      const receiverId = isGroup ? convId : String(conversation.value.targetId)

      // 生成系统消息包并发送
      const systemMessagePack = await createSystemMessagePack(
        receiverId,
        convId,
        SystemMsgSubType.RECALL,
        content,
        receiverIds
      )

      messageStore.sendSystemMessage(systemMessagePack as Message, convId, receiverIds as string[])
      break
    }
    case '引用': {

      break
    }
    case '删除': {
      const condition = {
        id: messageId
      }
      const data = {
        isDeleted: 1
      }
      // 修改本地数据库
      updateMessage(condition, data)
      // 修改缓存
      messageStore.deleteMessage(conversation.value.id, messageId)
      break
    }
  }
}

function scrollToBottom() {
  if (scrollbarRef.value) {
    scrollbarRef.value.setScrollTop(1000000)
  }
}

// 滚动监听
async function handleScroll({ scrollTop }: any) {
  if (scrollTop === 0 && messagePageInfo.pageNO > 0) {
    console.log('加载更多...');
    const lastMessageId = messageArr.value.at(0)?.id

    await loadMessage(conversation.value.id)

    // 等待 DOM 更新
    await nextTick()

    // 滚动到之前的第一条消息
    document.querySelector('#message' + lastMessageId)?.scrollIntoView()
  }
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
  const result = await getMessageList(newConversationId, messagePageInfo)
  const messageList = result.messageList
  const isFromServer = result.isFromServer
  // 本地数据库没数据，服务端数据库仍有数据时
  // const hasServerData = messageList.length > 0 && messagePageInfo.noData

  if (messageList.length > 0) {
    // 加入pinia缓存
    messageList.forEach((messagePcak: Message) => {
      messageStore.loadMessageMap(messagePcak.conversationId, messagePcak)
    })
  } else {
    // TODO 展示查询结束的消息
    console.info('数据查询完毕')
  }

  if (isFromServer && messageList.length > 0) {
    console.log('服务端数据写入')
    // 将从服务端查来的数据写入本地数据库
    saveLoadMessage(messageList)
  }
}

const messageArr = computed(() => {
  const convId = route.query.conversationId as string
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

      // 清空旧会话的消息缓存
      if (newConversationId) {
        messageStore.clearConversationMessages(newConversationId as string)
      }

      // 进入新会话时重置
      messagePageInfo.pageTotal = 0
      messagePageInfo.pageNO = 0
      messagePageInfo.maxMessageId = null
      messagePageInfo.noData = false

      console.info('重置之后的分页配置信息', messagePageInfo)

      // 初始化会话信息
      conversation.value = conversationStore.conversationMap[newConversationId as string]

      // 清空文件预览列表
      fileInfoList.value.length = 0

      if (oldConversationId === undefined) {
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

      await nextTick()
      scrollToBottom()
    } catch (error) {
      console.error('加载新会话消息失败', error)
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

.chat-list-right>div {
  position: relative;
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

/* 图标绝对定位，固定在气泡左侧垂直居中 */
.icon {
  position: absolute;
  left: -28px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

/* 发送中 Loading 样式 */
.send-load {
  color: #ffffff;
  animation: rotateLoading 1s linear infinite;
  transform-origin: center;
  margin-top: -10px;
}

/* 旋转动画 */
@keyframes rotateLoading {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* 发送失败 */
.send-failed {
  color: #f53f3f;
  cursor: pointer;
  margin-top: -3px;
}
</style>
