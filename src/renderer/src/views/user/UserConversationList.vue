<template>
  <div class="user-message-list">
    <div class="user-message-list-left">
      <div class="message-list-top">
        <AutocompleteSearch />
        <el-dropdown>
          <el-button style="background-color: rgba(35, 45, 60, 0.7); border-color: rgba(66, 153, 225, 0.2);"
            :icon="Plus" square></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="createGroupChat">发起群聊</el-dropdown-item>
              <el-dropdown-item @click="addFriend">添加好友</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="message-list-bottom">
        <el-scrollbar>
          <div v-for="conversation in conversationListArr" :key="conversation.id"
            :class="{ 'left-list-bg': active === conversation.id }" @click="starCall(conversation)">
            <ContextMenu :menu="[
              { label: '置顶聊天' },
              { label: '标为未读' },
              { divider: true },
              { label: '消息免打扰' },
              { label: '独立窗口显示' },
              { divider: true },
              { label: '删除' },
            ]" @select="(item) => handleChoice(item, conversation.id)">
              <div class="left-list">
                <div class="left-image">
                  <UnreadCounts :unreadCounts="conversation.unreadCount" />
                  <div v-if="conversation.type === 2 && conversation.avatar === null" class="iconfont icon-ai-chat">
                  </div>
                  <img v-else :src=conversation.avatar alt="头像" class="left-list-img" />
                </div>
                <div class="mid-message">
                  <h1 class="friend-name">{{ conversation.name }}</h1>
                  <div class="friend-message">{{ conversation.latestMsg }}</div>
                </div>
                <div class="right-count">
                  <div class="left-list-time" v-if="conversation.latestMsgTime !== 'Invalid Date'">
                    {{ conversation.latestMsgTime }}
                  </div>
                  <div class="conversation-status"></div>
                </div>
              </div>
            </ContextMenu>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <div class="user-chat-list-right">
      <router-view></router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { conversationInfo } from '../../stores/ConversationStore'
import { Plus } from '@element-plus/icons-vue'
import { Conversation } from '../../types/conversation'
import AutocompleteSearch from '../../components/AutocompleteSearch.vue'
import UnreadCounts from '../../components/UnreadCounts.vue'
import ContextMenu from '../../components/ContextMenu.vue';
import { getConversationList, updateConversation } from '../../db/dualDB'
import { formatMessageTime } from '../../utils/utils.js'

const router = useRouter()
const active = ref<string | undefined>('')
const userId = ref()
const conversationStore = conversationInfo()

const starCall = async (conversation: Conversation) => {
  active.value = conversation.targetId

  if (!userId.value) {
    console.info('获取当前用户ID失败，无法进入聊天页')
    return
  }
  console.info('消息列表时，好友id:' + conversation.targetId + ', 会话id:' + conversation.id)
  // 清除会话缓存中的未读消息数量
  conversationStore.clearUnreadCount(conversation.id as string)

  // TODO 清除本地数据库中的未读消息数量

  if (conversation.type === 2) {
    // 进入ai聊天窗口
    await router.push({
      path: '/aiChat',
      // 传递会话id
      query: { conversationId: conversation.id }
    })
  } else {
    // 进入好友聊天窗口
    await router.push({
      path: '/chat',
      // 传递会话id
      query: { conversationId: conversation.id }
    })
  }

  // TODO 像后端发送消息已读状态更新请求

}

const createGroupChat = () => {
  // 打开创建群聊窗口
  (window as any).windowToolApi.createNewWindow('createGroup')
}

const handleChoice = (item: any, conversationId: string) => {
  switch (item.label) {
    case '置顶聊天': {
      break
    }
    case '标为未读': {
      break
    }
    case '消息免打扰': {
      break
    }
    case '独立窗口显示': {
      break
    }
    case '删除': {
      // 更新会话状态为不显示
      const condition = {
        id: conversationId
      }
      const data = {
        status: 0
      }
      updateConversation(condition, data)
      // 从会话缓存中清除
      conversationStore.removeConversation(conversationId)
      break
    }
  }
}

const addFriend = () => {
  // 打开添加好友窗口
  (window as any).windowToolApi.createNewWindow('addFriend')
}

// TODO 过滤出状态为1的单聊会话列表 后面可以修改为在pinia中的getter函数中筛选
// const conversationListArr = computed(() =>
//   // Object.values(conversationStore.conversationMap).filter((item) => item.status === 1)
//   Object.values(conversationStore.conversationMap)
//     .concat(Object.values(conversationStore.groupConversationMap))
//     .filter((item) => item.status === 1)
// )

// const getFriendList = async () => {
//   const cache = Object.keys(conversationStore.conversationMap).length > 0
//   if (cache) {
//     console.info('会话列表缓存非空:', cache)
//     return
//   }

//   // TODO：修改第一步，数据库新增会话表，这里应该查询会话表，但是没有会话id，所以还是需要查询好友表来构建会话id
//   // res为当前用户的好友列表
//   const res = await getFriendListApi()
//   console.info('好友列表:', res.data)

//   // 构建以好友id为键的映射表
//   const friendMap = new Map(res.data.map((f: { id: any }) => [f.id, f]))

//   // 获得当前登录用户id
//   userId.value = await window.userInfoApi.storeGetUserInfo('userId')

//   // 获得好友id数组，方便后续构建和每个好友的会话id
//   friendId.arr = res.data.map((item: { id: any }) => item.id)

//   console.info('好友id集合:', friendId.arr, '当前登录用户id为:', userId.value)

//   // 接下来需要构建会话ID和res.data中好友信息之间的联系
//   // 映射的键为 conversationIds 中的每一个元素；
//   // 映射的值为 res.data 中的元素；
//   // 映射关系是 conversationIds 中的 conversationId 包含 res.data 中的用户 id；
//   // 如 conversationId 为 2_1，则 res.data 中包含用户 id 为 1 和 2 的好友信息；
//   // 注意事项：由于 2 是当前登录用户，所以 2 不可能存在于 res.data 中，因为目前为止是没有添加自己为好友的业务的

//   // 组合会话id并关联对应的好友信息并存储在pinia中
//   // friendId.arr.forEach((friendIdItem) => {
//   //   conversationId.value =
//   //     userId.value > friendIdItem
//   //       ? userId.value + '_' + friendIdItem
//   //       : friendIdItem + '_' + userId.value
//   //   console.info('conversationId:', conversationId.value)
//   //   userNewMessageStore.setUserNewMessageMap(conversationId.value, {
//   //     id: friendIdItem,
//   //     username: friendMap.get(friendIdItem).username,
//   //     avatar: friendMap.get(friendIdItem).avatar,
//   //     remark: friendMap.get(friendIdItem).remark
//   //   })
//   // })

//   // 优化写法，遍历好友id数组，构建会话id并关联对应的好友信息并存储在pinia中
//   if (friendId.arr.length > 0) {
//     for (const fid of friendId.arr) {
//       const cid = `${Math.max(userId.value, fid)}_${Math.min(userId.value, fid)}`
//       console.info('cid:', cid)
//       // 到这里只是为了构建会话id，用来关联好友信息
//       const friend = friendMap.get(fid)
//       if (!friend) continue

//       // 用会话id做键，存储会话列表中的好友信息
//       conversationStore.setConversationMap(cid, {
//         // 好友id
//         friendId: fid,
//         username: friend.username,
//         avatar: friend.avatar,
//         remark: friend.remark
//       })
//       conversationId.list.push(cid)
//     }
//   }
//   if (conversationId.list.length > 0) {
//     // 从数据库查询会话列表，更新pinia中的会话信息
//     getConversationListApi(conversationId.list.join(',')).then((res) => {
//       console.info('会话列表:', res.data)
//       // 遍历会话列表，更新pinia中的会话信息
//       res.data.forEach((item) => {
//         conversationStore.setConversationMap(item.id, {
//           // 单聊会话id，格式为：maxId_minId，字符串类型
//           id: item.id,
//           latestMsg: item.latestMsg,
//           latestMsgTime: dayjs(item.latestMsgTime).format('HH:mm'),
//           unreadCount: item.unreadCount,
//           isTop: item.isTop,
//           status: item.status
//         })
//       })
//     })
//   }
// }

// const getGroupList = () => {
//   const cache = Object.keys(conversationStore.groupConversationMap).length > 0
//   if (cache) {
//     console.info('群聊列表缓存非空:', cache)
//     return
//   }

//   getGroupListApi().then((res) => {
//     console.info('群聊列表:', res.data)
//     // 遍历群聊列表，更新pinia中的会话信息
//     res.data.forEach((item: any) => {
//       conversationStore.setGroupConversationMap(item.id, {
//         // 群聊会话id，格式为g_雪花算法生成的字符串
//         id: item.id,
//         username: item.groupName,
//         avatar: item.groupAvatar,
//         latestMsg: item.latestMsg,
//         latestMsgTime: dayjs(item.latestMsgTime).format('HH:mm'),
//         unreadCount: item.unreadCount,
//         isTop: item.isTop,
//         status: item.status
//       })
//     })
//   })
// }

const loadConversationList = async () => {
  // 判断缓存中是否存在，存在可以不去sqlite中加载数据
  const cache = conversationStore.initCache(userId.value as string)

  if (!cache) {
    // 此时缓存为空或缓存失效
    console.info('会话缓存为空或缓存失效')

    const conversationList = await getConversationList()

    // 将会话信息存入pinia缓存中
    conversationList.forEach((conversation: Conversation) => {
      conversation.latestMsgTime = formatMessageTime(conversation.latestMsgTime)
      conversationStore.setConversationMap(conversation.id, conversation)
    })
  }
}

// 可以检测会话的更新实时展示
const conversationListArr = computed(() => {
  return Object.values(conversationStore.conversationMap)
})

onMounted(async () => {
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')

  // 查询会话列表
  loadConversationList()
})
</script>

<style scoped>
@import "../../css/layout.css";

.mid-message {
  flex: 1;
  /* 允许内容在空间不足时换行 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.friend-name {
  font-size: 16px;
  color: #ffffff;
  margin: 0;
  /*单行文本溢出显示省略号*/
  /*强制不换行*/
  white-space: nowrap;
  /*溢出部分进行隐藏*/
  overflow: hidden;
  /*文字移除的时候，显示省略号*/
  text-overflow: ellipsis;
  line-height: 1.4;
}

.friend-message {
  font-size: 13px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.right-count {
  flex-shrink: 0;
  margin-left: 40px;
  position: relative;
  height: 50px;
}

.left-list-time {
  position: absolute;
  top: 2px;
  right: 0;
  white-space: nowrap;
  font-size: 10px;
}

.user-status {
  position: absolute;
  top: 30px;
  right: 0;
}

.left-list-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  /* 防止头像被压缩 */
  flex-shrink: 0;
}

.user-chat-list-right {
  flex: 1;
  -webkit-app-region: drag;
}

.icon-ai-chat {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background-color: rgba(35, 45, 60, 0.7);
  color: #409eff;
}
</style>
