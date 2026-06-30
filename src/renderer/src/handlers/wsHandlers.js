import router from '../router/router'
import { messageInfo } from '../stores/modules/MessageStore'
import { userApplyListInfo } from '../stores/modules/UserApplyListStore'
import { conversationInfo } from '../stores/modules/ConversationStore'
import { friendInfo } from '../stores/modules/ContactListStore'
import emitter from '../utils/mitt'
import dayjs from 'dayjs'
import { saveSentMessage, deleteMessage, deleteConversation, deleteFriend, updateFriendRelation } from '../db/dualDB'
import { SystemMsgSubType } from '../utils/constants'
import NotificationCard from '../components/NotificationCard.vue'
import { groupMemberInfo } from '../stores/modules/GroupMemberStore'

// 独立窗口当前正在查看的会话ID（由 StandaloneChat.vue 通过 emitter 通知）
let standaloneActiveConvId = null
emitter.on('standaloneActiveConvId', (convId) => {
    standaloneActiveConvId = convId
})

function updateMessageStore(data) {
    const path = router.currentRoute.value.path
    const routeConvId = router.currentRoute.value.query.conversationId
    console.info('当前路径:', path)
    console.info('当前路由参数:', router.currentRoute.value.query)

    // 判断是否在当前聊天页面（兼容主窗口 /chat 和独立窗口 /standaloneChat）
    let isInCurrentChatPage = false
    if (path === '/chat') {
        isInCurrentChatPage = routeConvId === data.conversationId
    } else if (path === '/standaloneChat') {
        isInCurrentChatPage = standaloneActiveConvId === data.conversationId
    }

    if (!isInCurrentChatPage) {
        conversationInfo().addUnreadCount(data.conversationId)
    }
    messageInfo().addMessageMap(data.conversationId, data)
}

function handleIncomingMessage(data) {
    updateMessageStore(data)
    conversationInfo().setConversationMap(data.conversationId, {
        latestMsg: data.content,
        latestMsgTime: dayjs(data.sendTime).format('HH:mm')
    })
}

function handleFriendApply(data) {
    console.log('收到好友申请', data)
    userApplyListInfo().setUserApplyMap(data.applyId, data)
}

function handleGroupApply(data) {
    console.log('收到群聊申请', data)
    userApplyListInfo().setGroupApplyMap(data.userId, data)
}

function handleFriendOnline(data) {
    console.log('好友上线信息', data)
    emitter.emit('addNotification', {
        component: NotificationCard,
        props: {
            avatar: data.avatar,
            name: data.name,
            description: '上线了',
            variant: 'info'
        },
    })
    friendInfo().addUserOnline(data.userId)
}

function handleBatchOnline(data) {
    console.log('登录成功，在线好友列表', data.friendIdList)
    // 清除持久化缓存（仅清 localStorage，不影响当前内存中的 store 数据）
    // 不能使用 $reset()：会话列表依赖已加载的持久化数据，reset 会导致会话消失
    localStorage.removeItem('friendInfo-store')
    localStorage.removeItem('conversation-store')
    friendInfo().addUserListOnline(data.friendIdList)
}

function handleFriendOffline(data) {
    console.log('接收到用户的离线消息', data)
    friendInfo().removeUserOnline(data.userId)
}

const handleSystemMessage = (data) => {
    const subType = data.subType
    const senderId = data.senderId
    const receiverId = data.receiverId
    const conversationId = data.conversationId
    const messageType = data.messageType
    let content
    try {
        content = JSON.parse(data.content)
    } catch {
        console.warn('系统消息 content 解析失败:', data.content)
        return
    }
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
            const messageId = content.operationData
            messageInfo().addMessageMap(conversationId, messagePack)
            messageInfo().deleteMessage(conversationId, messageId)
            deleteMessage(conversationId, messageId)
            break
        case SystemMsgSubType.FRIEND_ADDED:
            messageInfo().addMessageMap(conversationId, messagePack)
            break
        case SystemMsgSubType.FRIEND_DELETED:
            const avatar = content.operationData
            const name = content.opName

            conversationInfo().deleteConversation(conversationId)
            friendInfo().deleteFriendMap(senderId)

            deleteConversation(conversationId)
            deleteFriend(senderId)

            emitter.emit('addNotification', {
                component: NotificationCard,
                props: {
                    avatar: avatar,
                    name: name,
                    description: '已将你删除',
                    variant: 'warning'
                },
            })
            break
        case SystemMsgSubType.FRIEND_BLACKLIST:
            // 被对方拉黑：更新本地好友状态为"对方拉黑了我" (3) + 通知
            const blacklistAvatar = content.operationData
            const blacklistName = content.opName

            // 更新Pinia好友状态：3 = 对方拉黑了我（区别于 2 = 我拉黑了对方）
            friendInfo().updateFriendMap(senderId, { relationStatus: 3 })

            // 更新本地SQLite：只修改 B→A 这条记录的状态为 3
            updateFriendRelation({ friendId: String(senderId) }, { relationStatus: 3 })

            // 弹出通知告知用户被拉黑
            emitter.emit('addNotification', {
                component: NotificationCard,
                props: {
                    avatar: blacklistAvatar,
                    name: blacklistName,
                    description: '已将你拉黑，你将无法向对方发送消息',
                    variant: 'warning'
                },
            })
            break
        case SystemMsgSubType.GROUP_JOINED:
            messageInfo().addMessageMap(conversationId, messagePack)
            break
        case SystemMsgSubType.GROUP_KICKED:
            break
        case SystemMsgSubType.GROUP_LEAVED:
            messageInfo().addMessageMap(conversationId, messagePack)
            const avatarMember = content.operationData
            const nameMember = content.opName
            const groupName = content.targetName

            emitter.emit('addNotification', {
                component: NotificationCard,
                props: {
                    avatar: avatarMember,
                    name: nameMember,
                    description: '已退出群聊',
                    variant: 'warning',
                    groupName: groupName
                },
            })
            break
        case SystemMsgSubType.GROUP_DISBANDED:
            messageInfo().addMessageMap(conversationId, messagePack)

            conversationInfo().deleteConversation(conversationId)
            deleteConversation(conversationId)

            emitter.emit('addNotification', {
                component: NotificationCard,
                props: {
                    avatar: content.operationData,
                    name: content.targetName,
                    description: '该群已被解散',
                    variant: 'danger'
                },
            })
            break
    }
}

function handleFriendAccepted(data) {
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
        component: NotificationCard,
        props: {
            avatar: data.avatar,
            name: data.username,
            description: '同意你的好友申请',
            variant: 'info',
            showGender: true,
            gender: data.gender
        },
    })
}

function handleAckMessage(data) {
    console.log('接收到ACK确认消息', data)
    if (data.status === 0) {
        const messagePack = messageInfo().onReceiveAck(data.tempId)
        if (!messagePack) {
            console.warn('ACK对应的消息未找到（可能已超时）, tempId:', data.tempId)
            return
        }
        messagePack.id = data.messageId
        const message = { ...messagePack, receiverIds: [] }
        console.log(message)
        saveSentMessage(message)
    }
}

function handleGroupAccepted(data) {
    console.log('接收到群聊申请处理消息', data)
    groupMemberInfo().addGroupMember(data.conversationId, data)
    emitter.emit('addNotification', {
        component: NotificationCard,
        props: {
            avatar: data.avatar,
            name: data.username,
            description: '加入了群聊',
            variant: 'info'
        },
    })
}

// Define handler map OUTSIDE registerWsHandlers
const messageHandlers = {
    2: handleIncomingMessage,
    4: handleIncomingMessage,
    6: handleFriendApply,
    8: handleGroupApply,
    9: handleFriendOnline,
    10: handleBatchOnline,
    11: handleFriendOffline,
    13: handleSystemMessage,
    15: handleFriendAccepted,
    16: handleAckMessage,
    18: handleGroupAccepted,
}

let _wsHandlersRegistered = false

export function registerWsHandlers() {
    if (_wsHandlersRegistered) return
    _wsHandlersRegistered = true

    window.wsApi.onMessage((messageType, data) => {
        const handler = messageHandlers[messageType]
        if (handler) {
            try {
                handler(data)
            } catch (err) {
                console.error(`WS消息处理失败 (type=${messageType}):`, err)
            }
        } else {
            console.warn(`未处理的WS消息类型: ${messageType}`)
        }
    })
}
