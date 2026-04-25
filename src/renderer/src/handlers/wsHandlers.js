import router from '../router/router'
import { messageInfo } from '../stores/modules/MessageStore'
import { userApplyListInfo } from '../stores/modules/UserApplyListStore'
import { conversationInfo } from '../stores/modules/ConversationStore'
import { friendInfo } from '../stores/modules/ContactListStore'
import emitter from '../utils/mitt'
import dayjs from 'dayjs'
import { saveSentMessage, deleteMessage, deleteConversation, deleteFriend } from '../db/dualDB'
import { SystemMsgSubType } from '../utils/constants'
import FriendOnlineNotify from '../components/FriendOnlineNotify.vue'
import FriendAddNotify from '../components/FriendAddNotify.vue'
import FriendDeleteNotify from '../components/FriendDeleteNotify.vue'
import { groupMemberInfo } from '../stores/modules/GroupMemberStores'
import GroupAddNotify from '../components/GroupAddNotify.vue'
import GroupExitNotify from '../components/GroupExitNotify.vue'
import GroupDissolveNotify from '../components/GroupDissolveNotify.vue'

function updateMessageStore(data) {
    const path = router.currentRoute.value.path
    const conversationId = router.currentRoute.value.query.conversationId
    console.info('当前路径:', path)
    console.info('当前路由参数:', router.currentRoute.value.query)
    const isInCurrentChatPage = path === '/chat' && conversationId === data.conversationId
    if (!isInCurrentChatPage) {
        conversationInfo().addUnreadCount(data.conversationId)
    }
    messageInfo().addMessageMap(data.conversationId, data)
}

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
                component: FriendDeleteNotify,
                props: {
                    avatar: avatar,
                    name: name,
                },
            })
            break
        case SystemMsgSubType.FRIEND_BLACKLIST:
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
                component: GroupExitNotify,
                props: {
                    avatar: avatarMember,
                    name: nameMember,
                    groupName: groupName
                },
            })
            break
        case SystemMsgSubType.GROUP_DISBANDED:
            messageInfo().addMessageMap(conversationId, messagePack)

            conversationInfo().deleteConversation(conversationId)
            deleteConversation(conversationId)

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

export function registerWsHandlers() {
    window.wsApi.onMessage((messageType, data) => {
        switch (messageType) {
            case 2:
            case 4:
                updateMessageStore(data)
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
                    const messagePack = messageInfo().onReceiveAck(data.tempId)
                    console.log(messagePack)
                    messagePack.id = data.messageId
                    const message = { ...messagePack, receiverIds: [] }
                    console.log(message)
                    saveSentMessage(message)
                }
                break
            case 18:
                console.log('接收到群聊申请处理消息', data)
                groupMemberInfo().addGroupMember(data.conversationId, data)
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
}

