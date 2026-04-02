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
import { updateMessage, deleteConversation, deleteFriend } from './db/dualDB'
import emitter from '../src/utils/mitt'
import dayjs from 'dayjs'
import { updateMessageFileSendStatusApi } from './api/Message'
import { saveSentMessage, deleteMessage } from './db/dualDB'
import { SystemMsgSubType, getSystemMsgText } from './utils/constants'
import FriendOnlineNotify from './components/FriendOnlineNotify.vue'
import FriendAddNotify from './components/FriendAddNotify.vue'
import FriendDeleteNotify from './components/FriendDeleteNotify.vue'
import { groupMemberInfo } from './stores/modules/GroupMemberStores'
import GroupAddNotify from './components/GroupAddNotify.vue'
import GroupExitNotify from './components/GroupExitNotify.vue'
import GroupDissolveNotify from './components/GroupDissolveNotify.vue'

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
        emitter.emit('addNotification', {
          component: FriendOnlineNotify,
          props: {
            avatar: data.avatar,
            name: data.name
          },
        })
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
      case 13:
        console.log('接收到系统消息', data)
        // 不需要在这里添加消息到本地数据库中，已经在主进程中接收到就直接添加进去了
        handleSystemMessage(data)
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
          relationStatus: data.relationStatus,
          isOnline: true
        }
        friendInfo().setFriendMap(data.friendId, friendInfoPack)
        const conversationPack = {
          id: data.conversationId,
          userId: data.userId,
          targetId: data.friendId,
          name: data.username,
          avatar: data.avatar,
          type: 0,
          isTop: 0,
          isMute: 0,
          unreadCount: 0
        }
        conversationInfo().setConversationMap(data.conversationId, conversationPack)

        emitter.emit('addNotification', {
          component: FriendAddNotify,
          props: {
            avatar: data.avatar,
            name: data.username,
            gender: data.gender
          },
        })
        break
      case 16:
        console.log('接收到ACK确认消息', data)
        if (data.status === 0) {
          // 成功的ACK
          const messagePack = messageInfo().onReceiveAck(data.tempId)
          console.log(messagePack)
          messagePack.id = data.messageId
          const message = { ...messagePack, receiverIds: [] }
          // 将消息存储到数据库中
          console.log(message)
          saveSentMessage(message)
        }
        break
      case 18:
        console.log('接收到群聊申请处理消息', data)
        // 将同意申请的好友信息添加到群聊缓存中
        groupMemberInfo().addGroupMember(data.conversationId, data)
        // 卡片通知
        emitter.emit('addNotification', {
          component: GroupAddNotify,
          props: {
            avatar: data.avatar,
            name: data.username,
            role: data.role
          },
        })
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

      // 上传成功之后，再发送ws消息展示到对方界面
      const rawMessagePack = toRaw(messageInfo().getFileMessage(fileId))

      console.log(rawMessagePack)

      // 使用专门的文件消息发送方法，不会重复添加缓存
      messageInfo().sendFileMessage(rawMessagePack, rawMessagePack.conversationId, rawMessagePack.receiverIds)

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

  const handleSystemMessage = (data) => {
    const subType = data.subType
    const senderId = data.senderId
    const receiverId = data.receiverId
    const conversationId = data.conversationId
    const messageType = data.messageType
    const content = JSON.parse(data.content)
    const tpl = content.tpl
    const messagePack = {
      id: data.id,
      senderId: senderId,
      receiverId: receiverId,
      conversationId: conversationId,
      subType: messageType,
      msgType: 99,
      content: tpl,
      sendStatus: 1,
      sendTime: ''
    }
    switch (subType) {
      case SystemMsgSubType.RECALL:
        // 消息撤回
        const messageId = content.operationData
        // 添加系统消息到缓存中
        messageInfo().addMessageMap(conversationId, messagePack)
        // 缓存中删除该消息
        messageInfo().deleteMessage(conversationId, messageId)
        // 本地数据库中删除该消息
        deleteMessage(conversationId, messageId)
        break
      case SystemMsgSubType.FRIEND_ADDED:
        // 添加好友成功，将消息添加到缓存中用来实时展示
        messageInfo().addMessageMap(conversationId, messagePack)
        break
      case SystemMsgSubType.FRIEND_DELETED:
        // 被对方删除好友，需要拿到对方的id
        const avatar = content.operationData
        const name = content.opName

        // 缓存中删除和对方的好友关系
        conversationInfo().deleteConversation(conversationId)
        friendInfo().deleteFriendMap(senderId)

        // 本地删除和对方的好友关系
        deleteConversation(conversationId)
        deleteFriend(senderId)

        // 卡片通知你被该好友删除
        emitter.emit('addNotification', {
          component: FriendDeleteNotify,
          props: {
            avatar: avatar,
            name: name,
          },
        })
        break
      case SystemMsgSubType.FRIEND_BLACKLIST:
        // 被对方拉黑，需要拿到对方的id

        // 修改本地数据库和该好友的关系，不需要通知

        break
      case SystemMsgSubType.GROUP_JOINED:
        // 有成员入群
        messageInfo().addMessageMap(conversationId, messagePack)
        break
      case SystemMsgSubType.GROUP_KICKED:
        // 有成员被踢

        // 如果是该群的群主，就展示Notification通知卡片

        break
      case SystemMsgSubType.GROUP_LEAVED:
        // 有成员离开
        messageInfo().addMessageMap(conversationId, messagePack)
        // 展示Notification通知卡片
        const avatarMember = content.operationData
        const nameMember = content.opName
        const groupName = content.targetName

        emitter.emit('addNotification', {
          component: GroupExitNotify,
          props: {
            avatar: avatarMember,
            name: nameMember,
            groupName: groupName
          },
        })
        break
      case SystemMsgSubType.GROUP_DISBANDED:
        // 有群聊被群主解散
        messageInfo().addMessageMap(conversationId, messagePack)

        // 缓存中删除该会话信息
        conversationInfo().deleteConversation(conversationId)
        // 本地删除该会话信息
        deleteConversation(conversationId)

        // 展示Notification通知卡片，该群聊被解散
        emitter.emit('addNotification', {
          component: GroupDissolveNotify,
          props: {
            groupAvatar: content.operationData,
            groupName: content.targetName
          },
        })
        break
    }
  }
})

</script>
