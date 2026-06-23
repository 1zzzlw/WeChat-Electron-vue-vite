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
          <!-- 自己发送的消息 -->
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
                  <div v-if="message.quoteMsgId" class="quote-block">
                    <div class="quote-block-text">{{ getQuoteDisplayText(message) }}</div>
                  </div>
                  <div> {{ message.content }} </div>
                </div>
                <MessageContentManage v-else v-bind="message" :isUpload="true"
                  @red-packet-open="handleRedPacketOpenFromCard" />
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
          <!-- 对方发送的消息 -->
          <div v-else-if="message.msgType !== 99">
            <div class="chat-list-left">
              <img :src="getAvatarForSender(message.senderId)" class="list-image" />
              <div class="msg">
                <div v-if="getNameForSender(message.senderId)" class="left-name">
                  {{ getNameForSender(message.senderId) }}
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
                    <div v-if="message.quoteMsgId" class="quote-block">
                      <div class="quote-block-text">{{ getQuoteDisplayText(message) }}</div>
                    </div>
                    <div> {{ message.content }} </div>
                  </div>
                  <MessageContentManage v-else v-bind="message" :isUpload="false"
                    @red-packet-open="handleRedPacketOpenFromCard" />
                </ContextMenu>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <FilePreviewView v-if="fileInfoList.length > 0" :fileInfoList="fileInfoList" @delete-file="handleDeleteFile" />
    <!-- 引用消息预览 -->
    <div v-if="quoteMessage" class="quote-preview">
      <div class="quote-preview-content">
        <span class="quote-preview-label">引用</span>
        <span class="quote-preview-text">{{ getMessageSnapshot(quoteMessage) }}</span>
      </div>
      <el-icon class="quote-preview-close" @click="quoteMessage = null">
        <Close />
      </el-icon>
    </div>
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
      <el-button :icon="Scissor" size="large" square @click="captureBtn"></el-button>
      <el-button :icon="VideoCamera" size="large" square></el-button>
      <el-button :icon="Money" size="large" square class="red-packet-btn" title="发红包"
        @click="showRedPacketDialog = true"></el-button>
    </div>
    <form class="chat-input">
      <el-input v-model="messageText" type="textarea" :rows="4" resize="none" placeholder="请输入消息" spellcheck="false"
        clearable @keydown.enter="handleEnterMessage" />
    </form>
    <div class="sendButton">
      <el-button type="primary" @click="sendMessage">发送</el-button>
    </div>
  </div>

  <!-- 发红包对话框 -->
  <SendRedPacket v-model:visible="showRedPacketDialog" @send="handleSendRedPacket" />

  <!-- 开红包弹窗 -->
  <OpenRedPacket v-if="openRedPacketData" :visible="!!openRedPacketData" :redPacketId="openRedPacketData.redPacketId"
    :messageId="openRedPacketData.messageId" :conversationId="openRedPacketData.conversationId"
    :senderName="openRedPacketData.senderName" :blessing="openRedPacketData.blessing"
    @update:visible="openRedPacketData = null"
    @opened="handleRedPacketOpened" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, onUnmounted, toRaw } from 'vue'
import { useRoute } from 'vue-router'
import emojis from '../../emoji/emoji'
import { sendMessageApi, recallMessageApi } from '../../api/Message'
import { saveFavoriteApi } from '../../api/Favorites'
import { messageInfo } from '../../stores/modules/MessageStore'
import dayjs from 'dayjs'
import { Conversation, initConversation } from '../../types/conversation'
import { FileBaseInfo, FileUploadStatusInfo } from '../../types/fileBaseInfo'
import { statusMap } from '../../utils/constants'
import { conversationInfo } from '../../stores/modules/ConversationStore'
import { friendInfo } from '../../stores/modules/ContactListStore'
import { fileStatusListInfo } from '../../stores/modules/FileStatusInfoStore'
import { Eleme, Folder, Scissor, VideoCamera, Close, Loading, WarningFilled, Money } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { groupMemberInfo } from '../../stores/modules/GroupMemberStore'
import { getGroupMemberListApi } from '../../api/Conversation'
import MessageContentManage from '../../components/MessageContentManage.vue'
import FilePreviewView from '../../components/FilePreviewView.vue'
import ChatHeader from '../../components/ChatHeader.vue'
import { getMessageList, saveSentMessage, saveLoadMessage, updateConversation, updateMessage, addFavorites, deleteMessage } from '../../db/dualDB'
import { Message } from '../../types/message'
import { Snowflake } from '@theinternetfolks/snowflake'
import ContextMenu from '../../components/ContextMenu.vue'
import ChatMessageTime from '../../components/ChatMessageTime.vue'
import ChatMessageSystem from '../../components/ChatMessageSystem.vue'
import { createSystemMessagePack, createContentJson } from '../../utils/systemMessageUtil'
import { SystemMsgSubType, getSystemMsgText } from '../../utils/constants'
import { useChatScroll } from '../../composables/useChatScroll'
import SendRedPacket from '../../components/SendRedPacket.vue'
import OpenRedPacket from '../../components/OpenRedPacket.vue'
import { sendRedPacketApi } from '../../api/RedPacket'

// ==================== Props ====================
const props = withDefaults(defineProps<{
  conversation: Conversation
  userId: string | number
  avatarUrl: string
  /** 根据发送者ID获取头像（群聊用） */
  getSenderAvatar?: (senderId: string | number) => string
  /** 根据发送者ID获取名称（群聊用） */
  getSenderName?: (senderId: string | number) => string | undefined
  /** 独立窗口模式下传入的会话ID（可选，优先级高于 route.query） */
  convId?: string
}>(), {
  getSenderAvatar: undefined,
  getSenderName: undefined,
  convId: undefined
})

const emit = defineEmits<{
  (e: 'red-packet'): void
}>()

// ==================== Stores ====================
const route = useRoute()
const messageStore = messageInfo()
const conversationStore = conversationInfo()
const groupMemberStore = groupMemberInfo()
const fileStatusListInfoStore = fileStatusListInfo()
const friendInfoStore = friendInfo()

// ==================== 消息分页配置 ====================
const messagePageInfo = {
  pageTotal: 0,
  pageNO: 0,
  maxMessageId: null as string | null,
  noData: false
}

// ==================== 响应式状态 ====================
const messageText = ref('')
const fileUrl = ref('')
const scrollbarRef = ref()
let fileInfoList = ref<FileBaseInfo[]>([])
const quoteMessage = ref<Message | null>(null)
const showRedPacketDialog = ref(false)
const openRedPacketData = ref<{
  redPacketId: string
  messageId: string
  conversationId: string
  senderName: string
  blessing: string
} | null>(null)

// ==================== 计算属性 ====================
const effectiveConvId = computed(() => {
  return props.convId || (route.query.conversationId as string)
})

const messageArr = computed(() => {
  const convId = effectiveConvId.value
  return messageStore.messageMap[convId] || []
})

// ==================== 头像/名称辅助 ====================
function getAvatarForSender(senderId: string | number): string {
  if (props.getSenderAvatar) return props.getSenderAvatar(senderId)
  return props.conversation.avatar || ''
}

function getNameForSender(senderId: string | number): string | undefined {
  if (props.getSenderName) return props.getSenderName(senderId)
  // 单聊显示对方名称；群聊由 getSenderName 提供
  if (props.conversation.type === 0) {
    return props.conversation.remark || props.conversation.name
  }
  // 群聊但未提供 getSenderName 时不显示名称
  return undefined
}

// ==================== 红包操作 ====================
const handleSendRedPacket = async (data: { amount: number; count: number; blessing: string; type: number }) => {
  const convId = effectiveConvId.value
  const isPrivate = props.conversation.type === 0
  const receiverId = props.conversation.targetId || ''

  try {
    // 先调后端创建红包，拿到真实 redPacketId
    const res = await sendRedPacketApi({
      conversationId: convId,
      receiverId: receiverId,
      totalAmount: (data.amount / 100).toFixed(2),  // 分 -> 元
      totalCount: data.count,
      type: data.type ?? 0,
      greeting: data.blessing
    })
    const redPacketId = String(res.data?.id || '')

    // 获取当前用户名
    const senderName = await (window as any).userInfoApi.storeGetUserInfo('username')

    const content = JSON.stringify({
      redPacketId,
      amount: data.amount,
      count: data.count,
      status: 0,
      senderName: senderName || '',
      blessing: data.blessing
    })

    const messagePack = createMessagePack(receiverId, convId, 6, content, null)

    if (!isPrivate) {
      messagePack.receiverIds = (
        groupMemberStore.groupMemberMap[convId]
          ?.filter((item) => item.userId !== props.userId)
          .map((item) => item.userId) || []
      ) as string[]
    }

    messageStore.sendMessage(messagePack, convId, messagePack.receiverIds || [])
    updateConversationInfo(messagePack)
    nextTick(() => scrollToBottom())
  } catch (e) {
    ElMessage.error('发红包失败，请检查余额')
  }
}

const handleRedPacketOpened = (data: { redPacketId: string; amount: number; messageId: string }) => {
  // 更新本地消息内容中的红包状态（已领取），避免再次点击
  const convId = effectiveConvId.value
  const messages = messageStore.messageMap[convId] || []
  const msg = messages.find(m => m.id === data.messageId)
  if (msg) {
    try {
      const parsed = JSON.parse(msg.content || '{}')
      parsed.grabbed = true
      parsed.grabbedAmount = data.amount
      msg.content = JSON.stringify(parsed)
    } catch { /* ignore */ }
  }
}

const handleRedPacketOpenFromCard = (data: { redPacketId: string; id: string; conversationId: string }) => {
  // 从消息中解析发送者名称
  const messages = messageStore.messageMap[data.conversationId] || []
  const msg = messages.find(m => m.id === data.id)
  let senderName = ''
  let blessing = ''
  if (msg) {
    try {
      const parsed = JSON.parse(msg.content || '{}')
      senderName = parsed.senderName || ''
      blessing = parsed.blessing || ''
    } catch { /* ignore */ }
  }
  openRedPacketData.value = {
    redPacketId: data.redPacketId,
    messageId: data.id,
    conversationId: data.conversationId,
    senderName,
    blessing
  }
}

// ==================== 文件操作 ====================
const selectFile = async () => {
  const file = await (window as any).uploadFileApi.selectFile('uploadFile')
  if (!file) return
  if (fileInfoList.value.length >= 3) {
    ElMessage.error('最多3个文件')
    return
  }
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

const handleDeleteFile = (fileId: string) => {
  fileInfoList.value = fileInfoList.value.filter(file => file.fileId != fileId)
}

// ==================== Emoji ====================
const handlerEmoji = (emoji: any) => {
  messageText.value += emoji
}

// ==================== 截图 ====================
const captureBtn = () => {
  ; (window as any).chatToolApi.openCapture()
    ; (window as any).chatToolApi.sendImageToMain((fileInfo: any) => {
      if (fileInfoList.value.length >= 3) {
        ElMessage.error('最多3个文件')
        return
      }
      fileInfoList.value.push({
        base64: fileInfo.base64,
        fileId: fileInfo.fileId,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        fileType: 2,
        content: fileInfo.content || '[照片]',
        localPath: fileInfo.localPath,
        remotePath: '',
      })
      ElMessage.success('截屏已添加到文件列表')
    })
}

// ==================== 发送消息 ====================
const handleEnterMessage = (e: KeyboardEvent) => {
  if (e.shiftKey) return
  e.preventDefault()
  sendMessage()
}

const sendMessage = async () => {
  const convId = effectiveConvId.value
  const content = messageText.value
  const isPrivate = props.conversation.type === 0
  const receiverId = isPrivate ? props.conversation.targetId : convId

  // ---------- 私聊拉黑检查 ----------
  if (isPrivate && receiverId) {
    const friendData = friendInfoStore.friendInfoMap[receiverId as string | number]
    if (friendData?.relationStatus === 2) {
      ElMessage.warning('对方已被你拉黑，无法发送消息')
      return
    }
    if (friendData?.relationStatus === 3) {
      ElMessage.warning('消息已发出，但被对方拒收了')
      return
    }
  }

  // 获取接收者ID列表
  const receiverIds = isPrivate ? [] : (
    groupMemberStore.groupMemberMap[convId]
      ?.filter((item) => item.userId !== props.userId)
      .map((item) => item.userId) || []
  )

  // ---------- 处理文件消息 ----------
  if (fileInfoList.value.length > 0) {
    for (const file of fileInfoList.value) {
      const { minioFilePath, chunkCount } = await (window as any).uploadFileApi.uploadFile(toRaw(file))
      file.remotePath = minioFilePath

      const fileStatusInfo: FileUploadStatusInfo = {
        fileId: file.fileId,
        chunkCount,
        uploadStatus: statusMap.uploading.value,
        uploadProgress: 0,
        uploadSpeed: 0,
        pause: false
      }
      fileStatusListInfoStore.addFileUploadUpdateInfo(file.fileId, fileStatusInfo)

      const messagePack = createMessagePack(receiverId as string, convId, file.fileType, file.content, file)
      messagePack.receiverIds = receiverIds as string[]
      messageStore.addFileMessage(file.fileId, messagePack)

      sendApi(messagePack)
    }
    fileInfoList.value.length = 0
    quoteMessage.value = null
  }

  // ---------- 处理文本消息 ----------
  if (content !== '') {
    messageText.value = ''
    const messagePack = createMessagePack(receiverId as string, convId, 1, content, null)
    quoteMessage.value = null

    messageStore.sendMessage(messagePack, convId, receiverIds as string[])
    updateConversationInfo(messagePack)

    await nextTick()
    scrollToBottom()
  }
}

const sendApi = (messagePack: Message) => {
  sendMessageApi(messagePack).then(async (res) => {
    messageText.value = ''
    fileUrl.value = ''

    if (res.data) {
      const message = res.data

      messagePack.remoteUrl = message.remoteUrl
      messageStore.addMessageMap(messagePack.conversationId, messagePack)

      // 文件消息立即持久化到 IndexedDB，防止切换路由后上传组件消失
      saveSentMessage({ ...messagePack, receiverIds: [] })

      conversationStore.setConversationMap(messagePack.conversationId, {
        latestMsg: messagePack.content,
        latestMsgTime: dayjs(messagePack.sendTime).format('HH:mm:ss')
      })

      if (message.msgType === 1) {
        message.sendStatus = 1
      } else {
        message.sendStatus = 0
        messageStore.addFileUrl(message.fileId, message.remoteUrl)
      }

      const condition = { id: messagePack.conversationId }
      const data = {
        latestMsg: messagePack.content,
        latestMsgTime: messagePack.sendTime
      }
      updateConversation(condition, data)

      await nextTick()
      scrollToBottom()
    }
  })
}

const updateConversationInfo = (messagePack: Message) => {
  const condition = { id: messagePack.conversationId }
  const data = {
    latestMsg: messagePack.content,
    latestMsgTime: messagePack.sendTime
  }
  updateConversation(condition, data)
  conversationStore.setConversationMap(messagePack.conversationId, {
    latestMsg: messagePack.content,
    latestMsgTime: dayjs(messagePack.sendTime).format('HH:mm:ss')
  })
}

// ==================== 引用相关 ====================
const getMessageSnapshot = (msg: Message): string => {
  if (!msg) return ''
  if (msg.msgType === 1) return msg.content?.substring(0, 60) || ''
  if (msg.msgType === 2) return '[图片]'
  if (msg.msgType === 3) return '[视频]'
  if (msg.msgType === 4) return `[文件] ${msg.fileName || ''}`
  return msg.content?.substring(0, 60) || '[消息]'
}

const getQuoteDisplayText = (message: Message) => {
  const quoteMsgId = message.quoteMsgId
  if (!quoteMsgId) return ''
  if (message.quoteContent) return message.quoteContent
  const convId = props.conversation.id as string
  const messages = messageStore.messageMap[convId] || []
  const quoted = messages.find(m => String(m.id) === String(quoteMsgId))
  if (!quoted) return '[原消息已删除]'
  return getMessageSnapshot(quoted)
}

// ==================== 消息包装 ====================
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
  const sendTimeStamp = dayjs().valueOf()
  const sendTime = dayjs(sendTimeStamp).format('YYYY-MM-DD HH:mm:ss')
  const snowId = Snowflake.generate()

  const messagePack: Message = {
    id: snowId,
    senderId: props.userId,
    conversationId: convId,
    receiverId: receiverId,
    msgType: msgType,
    content: content,
    sendStatus: 0,
    sendTime: sendTime,
    fileId: fileId,
    fileName: fileName,
    fileSize: fileSize,
    localPath: localPath,
    previewBase64: base64,
    remotePath: remotePath,
    quoteMsgId: quoteMessage.value ? quoteMessage.value.id as unknown as number : null,
    quoteContent: quoteMessage.value ? getMessageSnapshot(quoteMessage.value) : null,
    quoteMsgType: quoteMessage.value ? quoteMessage.value.msgType : null
  }
  return messagePack
}

// ==================== 右键菜单 ====================
const handleChoice = async (item: any, messageId: string, messageContent: string, msgType: number, remoteUrl: any, fileName: any) => {
  switch (item.label) {
    case '复制': {
      (window as any).chatToolApi.copyFile(messageContent, remoteUrl, msgType, fileName)
      break
    }
    case '收藏': {
      const convId = props.conversation.id as string
      const messages = messageStore.messageMap[convId] || []
      const msg = messages.find(m => String(m.id) === String(messageId))
      if (!msg) {
        ElMessage.warning('消息不存在')
        break
      }
      try {
        const username = await (window as any).userInfoApi.storeGetUserInfo('username')
        let content = ''
        if (msg.msgType === 1) {
          const text = msg.content || ''
          content = `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`
        } else {
          content = msg.remoteUrl || msg.localPath || msg.content || ''
        }
        const favoritesPack = {
          userId: String(props.userId),
          title: msg.msgType === 1 ? (msg.content?.substring(0, 20) || '文本消息') : (msg.fileName || '文件消息'),
          content: content,
          sourceUsername: String(msg.senderId) === String(props.userId)
            ? username
            : (props.conversation.type === 0 ? props.conversation.remark || props.conversation.name : '群成员'),
          type: msg.msgType,
        }
        const result = await addFavorites([favoritesPack])
        if (result && result.success === false) {
          ElMessage.error('收藏失败：' + (result.error || '未知错误'))
        } else {
          ElMessage.success('已收藏')
          saveFavoriteApi({
            title: favoritesPack.title,
            content: favoritesPack.content,
            sourceUsername: favoritesPack.sourceUsername,
            type: favoritesPack.type
          }).catch(err => {
            console.warn('收藏同步到服务端失败（本地已保存）:', err)
          })
        }
      } catch (error) {
        console.error('收藏失败:', error)
        ElMessage.error('收藏失败，请重试')
      }
      break
    }
    case '撤回': {
      const convId = props.conversation.id as string
      const isGroup = props.conversation.type === 1

      const res: any = await recallMessageApi({
        conversationId: convId,
        messageId: messageId
      })
      if (res?.code !== 1) {
        ElMessage.error('撤回失败')
        break
      }

      messageStore.deleteMessage(convId, messageId)
      deleteMessage(convId, messageId)

      const receiverIds = isGroup
        ? (groupMemberStore.groupMemberMap[convId]
          ?.filter((m: any) => String(m.userId) !== String(props.userId))
          .map((m: any) => String(m.userId)) || [])
        : [String(props.conversation.targetId)]

      const myName = await (window as any).userInfoApi.storeGetUserInfo('username')
      const tpl = getSystemMsgText(SystemMsgSubType.RECALL, { name: myName })
      const content = createContentJson(tpl, myName, props.userId, props.conversation.name, messageId)
      const receiverId = isGroup ? convId : String(props.conversation.targetId)

      const systemMessagePack = await createSystemMessagePack(
        receiverId, convId, SystemMsgSubType.RECALL, content, receiverIds
      )
      messageStore.sendSystemMessage(systemMessagePack as Message, convId, receiverIds as string[])
      break
    }
    case '引用': {
      const convId = props.conversation.id as string
      const messages = messageStore.messageMap[convId] || []
      const msg = messages.find(m => String(m.id) === String(messageId))
      if (msg) {
        quoteMessage.value = msg
        await nextTick()
        const textarea = document.querySelector('.chat-input textarea') as HTMLTextAreaElement
        textarea?.focus()
      }
      break
    }
    case '删除': {
      const condition = { id: messageId }
      const data = { isDeleted: 1 }
      updateMessage(condition, data)
      messageStore.deleteMessage(props.conversation.id, messageId)
      break
    }
  }
}

// ==================== 滚动 ====================
const { scrollToBottom, handleScroll, loading, noMore, isNearBottom } = useChatScroll(
  scrollbarRef,
  {
    canLoadMore: () => messagePageInfo.pageNO > 0,
    onLoadMore: async () => { await loadMessage(props.conversation.id) },
    getFirstMessageId: () => messageArr.value.at(0)?.id
  }
)

// ==================== 加载数据 ====================
async function loadMessage(newConversationId: any) {
  const result = await getMessageList(newConversationId, messagePageInfo)
  const messageList = result.messageList
  const isFromServer = result.isFromServer

  if (messageList.length > 0) {
    messageList.forEach((messagePcak: Message) => {
      messageStore.loadMessageMap(messagePcak.conversationId, messagePcak)
    })
  }

  // 恢复属于当前会话的进行中文件消息，防止上传中切换路由后上传组件消失
  const pendingFileMessages = Object.values(messageStore.fileMessgaeMap)
    .filter(msg => msg.conversationId === newConversationId)
  for (const msg of pendingFileMessages) {
    messageStore.addMessageMap(newConversationId, msg)
  }

  if (isFromServer && messageList.length > 0) {
    saveLoadMessage(messageList)
  }
}

const getGroupMemberList = async () => {
  const convId = effectiveConvId.value
  if (!convId) return

  groupMemberStore.initGroupMemberMap(convId)

  const cache = groupMemberStore.groupMemberMap[convId].length > 0
  if (cache) return

  const res = await getGroupMemberListApi(convId)
  res.data.forEach((item: any) => {
    groupMemberStore.addGroupMember(convId, {
      conversationId: convId,
      userId: item.userId,
      username: item.username,
      role: item.role,
      avatar: item.avatar,
      isMute: item.isMute
    })
    groupMemberStore.addGroupMemberAvatar(item.userId, item.avatar)
  })
}

// ==================== 监听会话切换 ====================
// 同时监听 route query 和 conversation prop，确保 store 延迟加载时也能正确初始化
watch(
  [() => effectiveConvId.value, () => props.conversation?.id],
  async ([newConversationId], [oldConversationId]) => {
    if (!newConversationId) return

    // 如果 conversation prop 还没就绪（store 延迟加载），跳过本次
    // 当 prop 就绪后会再次触发 watch
    if (!props.conversation || !props.conversation.id) return

    try {
      messageStore.clearConversationMessages(newConversationId as string)

      messagePageInfo.pageTotal = 0
      messagePageInfo.pageNO = 0
      messagePageInfo.maxMessageId = null
      messagePageInfo.noData = false

      fileInfoList.value.length = 0
      quoteMessage.value = null

      await loadMessage(newConversationId)

      // 群聊时加载群成员列表
      if (props.conversation.type === 1) {
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

// ==================== 组件卸载 ====================
onUnmounted(() => {
  messagePageInfo.pageTotal = 0
  messagePageInfo.pageNO = 0
  messagePageInfo.maxMessageId = null
  messagePageInfo.noData = false
})

// ==================== 暴露给父组件 ====================
defineExpose({
  sendMessage,
  scrollToBottom,
  createMessagePack
})
</script>

<style scoped>
.chat-count {
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

.chat-tool .red-packet-btn:hover {
  color: #ff5a5f !important;
  text-shadow: 0 0 8px rgba(255, 90, 95, 0.4);
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
  resize: none;

  &::placeholder {
    color: rgba(240, 240, 240, 0.5);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(66, 153, 225, 0.3);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(66, 153, 225, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
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
  position: relative;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.left-bubble {
  background: rgba(45, 55, 70, 0.85);
  color: #f0f0f0;
  border-bottom-left-radius: 0;
  border: 1px solid rgba(66, 153, 225, 0.1);
}

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

.right-bubble {
  background: rgba(66, 153, 225, 0.35);
  color: #ffffff;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(66, 153, 225, 0.2);
}

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

.send-load {
  color: #ffffff;
  animation: rotateLoading 1s linear infinite;
  transform-origin: center;
  margin-top: -10px;
}

@keyframes rotateLoading {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.send-failed {
  color: #f53f3f;
  cursor: pointer;
  margin-top: -3px;
}

/* 引用预览栏 */
.quote-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin: 0 10px;
  background: rgba(66, 153, 225, 0.12);
  border-left: 3px solid rgba(66, 153, 225, 0.6);
  border-radius: 0 6px 6px 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.quote-preview-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.quote-preview-label {
  font-size: 12px;
  color: rgba(66, 153, 225, 0.9);
  font-weight: 500;
  white-space: nowrap;
}

.quote-preview-text {
  font-size: 13px;
  color: rgba(240, 240, 240, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-preview-close {
  font-size: 14px;
  color: rgba(240, 240, 240, 0.5);
  cursor: pointer;
  transition: color 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.quote-preview-close:hover {
  color: rgba(240, 240, 240, 0.9);
}

.quote-block {
  padding: 4px 8px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-left: 2px solid rgba(66, 153, 225, 0.5);
  border-radius: 0 4px 4px 0;
  font-size: 12px;
}

.quote-block-text {
  color: rgba(240, 240, 240, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}
</style>
