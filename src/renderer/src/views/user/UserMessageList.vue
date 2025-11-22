<template>
  <div class="user-message-list">
    <div class="user-message-list-left">
      <div class="message-list-top">
        <el-input
          style="width: 240px"
          placeholder="搜索"
          :prefix-icon="Search"
          spellcheck="false"
        />
        <el-dropdown>
          <el-button :icon="Plus" square></el-button>
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
          <div
            class="left-list"
            v-for="(friend, index) in friendListArr"
            :key="index"
            :class="{ 'left-list-bg': active == friend.id }"
            @click="starCall(friend)"
          >
            <div class="left-image">
              <img :src="friend.avatar" alt="头像" class="left-list-img" />
            </div>
            <div class="mid-message">
              <h1 class="friend-name">{{ friend.username }}</h1>
              <div class="friend-message">{{ friend.latestMsg }}</div>
            </div>
            <div class="right-count">
              <div class="left-list-time">{{ friend.latestMsgTime }}</div>
              <div class="left-list-count"></div>
              <div class="conversation-status"></div>
            </div>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { conversationInfo } from '../../stores/ConversationStore'
import { Search, Plus, ArrowDown } from '@element-plus/icons-vue'
import { getFriendListApi } from '../../api/Friend'
import { getConversationListApi, getGroupListApi } from '../../api/Conversation'
import dayjs from 'dayjs'

const router = useRouter()
const friendId = reactive({ arr: [] })
const active = ref('')
const userId = ref()
const conversationStore = conversationInfo()
const conversationId = reactive({ list: [] })

const starCall = async (friend) => {
  active.value = friend.id
  userId.value = await window.api.storeGetUserId()
  if (!userId.value) {
    console.info('获取当前用户ID失败，无法进入聊天页')
    return
  }
  console.info('消息列表时，好友id', friend.id)
  const cid = `${Math.max(userId.value, friend.id)}_${Math.min(userId.value, friend.id)}`
  await router.push({ path: '/chat', query: { conversationId: cid, friendId: friend.id } })
}

const createGroupChat = () => {
  console.info('createGroupChat')
  // 打开创建群聊窗口
  window.api.createNewWindow('createGroup')
}

const addFriend = () => {
  console.info('addFriend')
  // 打开添加好友窗口
  window.api.createNewWindow('addFriend')
}

// 过滤出状态为1的会话列表
const friendListArr = computed(() =>
  Object.values(conversationStore.conversationMap).filter((item) => item.status === 1)
)

const getFriendList = async () => {
  const cache = Object.keys(conversationStore.conversationMap).length > 0
  if (cache) {
    console.info('会话列表缓存非空:', cache)
    return
  }

  // TODO：修改第一步，数据库新增会话表，这里应该查询会话表，但是没有会话id，所以还是需要查询好友表来构建会话id
  // res为当前用户的好友列表
  const res = await getFriendListApi()
  console.info('好友列表:', res.data)

  // 构建以好友id为键的映射表
  const friendMap = new Map(res.data.map((f) => [f.id, f]))

  // 获得当前登录用户id
  userId.value = await window.api.storeGetUserId()

  // 获得好友id数组，方便后续构建和每个好友的会话id
  friendId.arr = res.data.map((item) => item.id)

  console.info('好友id集合:', friendId.arr, '当前登录用户id为:', userId.value)

  // 接下来需要构建会话ID和res.data中好友信息之间的联系
  // 映射的键为 conversationIds 中的每一个元素；
  // 映射的值为 res.data 中的元素；
  // 映射关系是 conversationIds 中的 conversationId 包含 res.data 中的用户 id；
  // 如 conversationId 为 2_1，则 res.data 中包含用户 id 为 1 和 2 的好友信息；
  // 注意事项：由于 2 是当前登录用户，所以 2 不可能存在于 res.data 中，因为目前为止是没有添加自己为好友的业务的

  // 组合会话id并关联对应的好友信息并存储在pinia中
  // friendId.arr.forEach((friendIdItem) => {
  //   conversationId.value =
  //     userId.value > friendIdItem
  //       ? userId.value + '_' + friendIdItem
  //       : friendIdItem + '_' + userId.value
  //   console.info('conversationId:', conversationId.value)
  //   userNewMessageStore.setUserNewMessageMap(conversationId.value, {
  //     id: friendIdItem,
  //     username: friendMap.get(friendIdItem).username,
  //     avatar: friendMap.get(friendIdItem).avatar,
  //     remark: friendMap.get(friendIdItem).remark
  //   })
  // })

  // 优化写法，遍历好友id数组，构建会话id并关联对应的好友信息并存储在pinia中
  for (const fid of friendId.arr) {
    const cid = `${Math.max(userId.value, fid)}_${Math.min(userId.value, fid)}`
    console.info('cid:', cid)
    // 到这里只是为了构建会话id，用来关联好友信息
    const friend = friendMap.get(fid)
    if (!friend) continue

    // 用会话id做键，存储会话列表中的好友信息
    conversationStore.setConversationMap(cid, {
      id: fid,
      username: friend.username,
      avatar: friend.avatar,
      remark: friend.remark
    })
    conversationId.list.push(cid)
  }

  // 从数据库查询会话列表
  getConversationListApi(conversationId.list.join(',')).then((res) => {
    console.info('会话列表:', res.data)
    // 遍历会话列表，更新pinia中的会话信息
    res.data.forEach((item) => {
      conversationStore.setConversationMap(item.id, {
        latestMsg: item.latestMsg,
        latestMsgTime: dayjs(item.latestMsgTime).format('HH:mm'),
        unreadCount: item.unreadCount,
        isTop: item.isTop,
        status: item.status
      })
    })
  })
}

const getGroupList = () => {
  getGroupListApi().then((res) => {
    console.info('群聊列表:', res.data)
  })
}

onMounted(() => {
  getFriendList()
  getGroupList()
})
</script>

<style scoped>
.user-message-list {
  display: flex;
  height: 100%;
  width: 100%;
}

.user-message-list-left {
  width: 200px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #91b5cf;
}

.message-list-top {
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 10px 10px 10px;
  gap: 5px;
  background-color: white;
}

.message-list-bottom {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.left-list {
  /* 固定高度确保所有项目一致 */
  height: 72px;
  /* 确保占满父容器 */
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px;
  gap: 10px;
  transition: 0.3s;
}

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
}

.friend-message {
  font-size: 13px;
  color: black;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.right-count {
  /* 防止被压缩 */
  flex-shrink: 0;
  margin-left: 40px;
  position: relative;
  height: 50px;
}

.left-list-time {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 14px;
}

.left-list-count {
  position: absolute;
  top: 10px;
  right: 0;
}

.user-status {
  position: absolute;
  top: 30px;
  right: 0;
}

.left-list:hover {
  background-color: #f5f7fa;
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
  background-color: aqua;
  -webkit-app-region: drag;
}
</style>
