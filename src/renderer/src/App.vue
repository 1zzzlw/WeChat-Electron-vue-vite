<template>
  <!--打开调试工具-->
  <p class="tip"></p>
  <router-view></router-view>
</template>

<script setup>
import { onMounted } from 'vue'
import router from '../src/router/router'
import { messageInfo } from '../src/stores/MessageStore'
import { userApplyListInfo } from '../src/stores/UserApplyListStore'
import { conversationInfo } from '../src/stores/ConversationStore'
import dayjs from 'dayjs'

function updateMessageStore(data) {
  // 私信类型，将消息存储到状态管理中
  const path = router.currentRoute.value.path
  const conversationId = router.currentRoute.value.query.conversationId
  console.info('当前路径:', path)
  console.info('当前路由参数:', router.currentRoute.value.query)
  const isInCurrentChatPage = path === '/chat' && conversationId === data.conversationId
  if (!isInCurrentChatPage) {
    // 此时用户不在和对方聊天，未读消息数增涨
    conversationInfo().addUnreadCount(data.conversationId)
  }
  messageInfo().addMessageMap(data.conversationId, data)
}

onMounted(() => {
  console.log('开启ws的监听事件')

  window.wsApi.onMessage((messageType, data) => {

    switch (messageType) {
      case 2:
      case 4:
        updateMessageStore(data)

        // 更新会话的最新消息和最新消息时间展示
        conversationInfo().setConversationMap(data.conversationId, {
          latestMsg: data.content,
          latestMsgTime: dayjs(data.sendTime).format('HH:mm')
        })
        break
      case 6:
        userApplyListInfo().setUserApplyMap(data.applyId, data)
        break
      case 8:
        userApplyListInfo().setGroupApplyMap(data.userId, data)
        break
    }
  })
})

</script>
