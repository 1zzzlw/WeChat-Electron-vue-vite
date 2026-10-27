<template>
  <!--打开调试工具-->
  <p class="tip"></p>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { registerWsHandlers } from '@/handlers/wsHandlers'
import { registerFileTransferHandlers } from '@/handlers/fileTransferHandlers'
import { initWallpaper, registerWallpaperHandlers } from '@/handlers/wallpaperHandlers'
import { getConversationList, getFriendList } from '@/db/dualDB'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { friendInfo } from '@/stores/modules/ContactListStore'
import { formatMessageTime } from '@/utils/utils'
import type { Conversation } from '@/types/conversation'
import type { Friend } from '@/types/friend'
import emitter from '@/utils/mitt'

let audio: HTMLAudioElement | null = null
let removeSoundListener: (() => void) | null = null
let lastSoundAt = 0
let removeDataSyncListener: (() => void) | null = null

const refreshInitializedData = async ({ userId }: { userId: string }) => {
  try {
    const [conversations, friends] = await Promise.all([getConversationList(), getFriendList()])
    const currentUserId = await (window as any).userInfoApi.storeGetUserInfo('userId')
    if (String(currentUserId) !== userId) return
    const conversationStore = conversationInfo()
    const friendStore = friendInfo()
    conversationStore.initCache(userId)
    friendStore.initCache(userId)
    // 从 SQLite 读最新状态，保留同步期间由 WS 写入的消息与未读变化。
    conversations.forEach((conversation: Conversation) => {
      conversationStore.setConversationMap(conversation.id, {
        ...conversation, latestMsgTime: formatMessageTime(conversation.latestMsgTime)
      })
    })
    friends.forEach((friend: Friend) => friendStore.setFriendMap(friend.friendId, friend))
    friendStore.restoreOnlineStatus()
    emitter.emit('data:initialized', { userId })
  } catch (error) {
    console.error('刷新初始同步数据失败', error)
  }
}

onMounted(async () => {
  // 壁纸初始化
  initWallpaper()
  registerWsHandlers()
  registerFileTransferHandlers()
  registerWallpaperHandlers()
  removeDataSyncListener = (window as any).loadApi.onDataInitSynced(refreshInitializedData)

  // 注册消息提示音监听
  if ((window as any).soundApi) {
    // public 会复制到 renderer 输出目录，开发/安装后都从同一个相对路径加载。
    audio = new Audio(new URL('./audios/sfx/message-sound.mp3', document.baseURI).href)
    audio.preload = 'auto'
    audio.volume = 0.8
    removeSoundListener = (window as any).soundApi.onPlayMessageSound(() => {
      try {
        if (!audio || Date.now() - lastSoundAt < 400) return
        lastSoundAt = Date.now()
        audio.pause()
        audio.currentTime = 0
        audio.play().catch(error => console.warn('消息提示音播放失败', error.message))
      } catch (e) {
        console.warn('消息提示音不可用', e)
      }
    })
  }
})

onUnmounted(() => {
  removeDataSyncListener?.()
  if (removeSoundListener) {
    removeSoundListener()
  }
  if (audio) {
    audio.pause()
    audio = null
  }
})
</script>
