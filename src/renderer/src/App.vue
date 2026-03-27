<template>
  <!--打开调试工具-->
  <p class="tip"></p>
  <router-view></router-view>
</template>

<script setup>
import { onMounted, toRaw } from 'vue'
import router from '../src/router/router'
import { messageInfo } from './stores/modules/MessageStore'
import { userApplyListInfo } from './stores/modules/UserApplyListStore'
import { conversationInfo } from './stores/modules/ConversationStore'
import { friendInfo } from './stores/modules/ContactListStore'
import { fileStatusListInfo } from './stores/modules/FileStatusInfoStore'
import { statusMap } from './types/fileBaseInfo'
import { updateMessage } from './db/dualDB'
import emitter from '../src/utils/mitt'
import dayjs from 'dayjs'
import { updateMessageFileSendStatusApi } from './api/Message'
import { saveSentMessage } from './db/dualDB'

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
    // 不需要添加缓存信息到pinia中，只有当用户在当前会话窗口时才需要添加信息到pinia中
    return
  }
  messageInfo().addMessageMap(data.conversationId, data)
}

onMounted(async () => {
  // 壁纸初始化
  window.userInfoApi.storeGetUserInfo('wallpaperPath').then((imagePath) => {
    document.body.style.backgroundImage = `url(${imagePath})`
  })

  // ws消息接收的全局监听器
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
        console.log('收到好友申请', data)
        userApplyListInfo().setUserApplyMap(data.applyId, data)
        break
      case 8:
        console.log('收到群聊申请', data)
        userApplyListInfo().setGroupApplyMap(data.userId, data)
        break
      case 9:
        console.log('好友上线信息', data)
        emitter.emit('friendOnline', data)
        friendInfo().addUserOnline(data.userId)
        break
      case 10:
        console.log('登录成功，在线好友列表', data.friendIdList)
        // 先清空缓存中的旧数据
        localStorage.removeItem('friendInfo-store')
        localStorage.removeItem('conversation-store')
        friendInfo().addUserListOnline(data.friendIdList)
        break
      case 11:
        console.log('接收到用户的离线消息', data)
        friendInfo().removeUserOnline(data.userId)
        break
      case 15:
        console.log('接收到申请处理的结果', data)
        const friendInfoPack = {
          userId: data.userId,
          username: data.username,
          account: data.account,
          friendId: data.friendId,
          avatar: data.avatar,
          gender: data.gender,
          phone: data.phone,
          relationStatus: data.relationStatus
        }
        friendInfo().setFriendMap(data.friendId, friendInfoPack)
        const conversationPack = {
          id: data.conversationId,
          userId: data.userId,
          targetId: data.friendId,
          name: data.username,
          avatet: data.avatar,
          type: 0,
          isTop: 0,
          isMute: 0,
          unreadCount: 0
        }
        conversationInfo().setConversationMap(data.conversationId, conversationPack)
        break
      case 16:
        console.log('接收到ACK确认消息', data)
        if (data.status === 0) {
          // 成功的ACK
          const messagePack = messageInfo().onReceiveAck(data.tempId)
          messagePack.id = data.messageId
          const message = { ...messagePack }
          // 将消息存储到数据库中
          console.log(message)
          saveSentMessage(message)
        }
    }
  })

  // 文件上传状态的全局监听器
  window.uploadFileApi.updateUploadProgress((e, uploadStatus) => {
    const { fileId, uploadProgress, uploadSpeed } = uploadStatus
    fileStatusListInfo().updateFileUploadProgressStatus(fileId, uploadProgress, uploadSpeed)
  })

  // 文件合并成功的监听器
  window.uploadFileApi.updateUploadStatus(async (e, uploadStatus) => {
    const { fileId, status } = await uploadStatus
    const condition = {
      fileId: fileId
    }
    let data = {};
    if (status === 1) {
      // 上传成功
      console.log('上传成功')
      fileStatusListInfo().updateFileUploadStatus(fileId, statusMap.upload_finish.value, 100)
      // 修改本地文件上传状态
      data = {
        sendStatus: 1
      }

      // 上传成功之后，再发送ws消息展示到对方界面
      const rawMessagePack = toRaw(messageInfo().getFileMessage(fileId))

      console.log(rawMessagePack)

      window.wsApi.sendMessage(1, 0, rawMessagePack)

      // 修改服务端的文件上次状态
      updateMessageFileSendStatusApi(fileId, 1)
    } else {
      // 上传失败
      console.log('上传失败')
      fileStatusListInfo().updateFileUploadStatus(fileId, statusMap.fail.value, 0)
      // 修改本地文件上传状态
      data = {
        sendStatus: 2
      }
      // 修改服务端的文件上次状态
      updateMessageFileSendStatusApi(fileId, 2)
    }
    // 修改本地的发送状态
    updateMessage(condition, data)

  })

  // 下载进度监听器
  window.uploadFileApi.updateDownloadProgress((e, downloadStatus) => {
    const { fileId, downloadProgress, downloadSpeed } = downloadStatus
    fileStatusListInfo().updateFileDownloadProgressStatus(fileId, downloadProgress, downloadSpeed)
  })

  // 下载是否成功的监听器
  window.uploadFileApi.updateDownloadStatus((e, downloadStatus) => {
    const { fileId, status } = downloadStatus
    const condition = {
      fileId: fileId
    }
    let data = {};
    if (status === 1) {
      // 上传成功
      console.log('下载成功')
      fileStatusListInfo().updateFileDownloadStatus(fileId, statusMap.download_finish.value, 100)
      // 修改本地文件上传状态
      data = {
        downloadStatus: 1
      }
    } else {
      // 上传失败
      console.log('上传失败')
      fileStatusListInfo().updateFileDownloadStatus(fileId, statusMap.fail.value, 0)
      // 修改本地文件上传状态
      data = {
        downloadStatus: 2
      }
    }
    updateMessage(condition, data)
  })

  // 切换壁纸监听器
  window.windowToolApi.onWindowWallpaper((e, imagePath) => {
    document.body.style.backgroundImage = `url(${imagePath})`
    window.userInfoApi.storeSetUserInfo('wallpaperPath', imagePath)
  })
})

</script>
