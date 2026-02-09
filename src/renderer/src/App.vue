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
import { fileStatusListInfo } from './stores/FileStatusInfoStore'
import { statusMap } from './types/fileBaseInfo'
import { updateMessage } from './db/dualDB'
import emitter from '../src/utils/mitt'
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
        userApplyListInfo().setUserApplyMap(data.applyId, data)
        break
      case 8:
        userApplyListInfo().setGroupApplyMap(data.userId, data)
        break
      case 9:
        console.log('好友上线信息')
        emitter.emit('friendOnline', data)
        break
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
    } else {
      // 上传失败
      console.log('上传失败')
      fileStatusListInfo().updateFileUploadStatus(fileId, statusMap.fail.value, 0)
      // 修改本地文件上传状态
      data = {
        sendStatus: 2
      }
    }
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
