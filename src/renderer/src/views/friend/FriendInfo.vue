<template>
  <div class="friendInfo-count">
    <div class="userInfo">
      <el-popover placement="bottom" trigger="click" :width="150">
        <div class="setButton">
          <div>设置备注</div>
          <div>加入黑名单</div>
          <div>删除好友</div>
        </div>
        <template #reference>
          <el-icon class="left-icon" size="25">
            <MoreFilled />
          </el-icon>
        </template>
      </el-popover>
      <div class="accountInfo">
        <img :src="friendBaseInfo?.avatar" alt="">
        <div class="accountInfo-info">
          <p>用户名: {{ friendBaseInfo?.username }}</p>
          <span>账号: {{ friendBaseInfo?.account }} </span>
          <div v-show="userOnlineStatus" class="online-status">在线</div>
          <div v-show="!userOnlineStatus" class="offline-status">离线</div>
        </div>
      </div>
      <div class="baseInfo">
        <div>备注: {{ friendBaseInfo?.remark }}
        </div>
        <div>性别:
          <span v-if="friendBaseInfo?.gender === '1.0'">
            男 <el-icon
              style="color: #409eff; font-size: 16px; filter: drop-shadow(0 0 2px #409eff); vertical-align: middle; margin-left: 4px;">
              <Male />
            </el-icon>
          </span>
          <span v-else-if="friendBaseInfo?.gender === '2.0'">
            女 <el-icon
              style="color: #ff8acc; font-size: 16px; filter: drop-shadow(0 0 2px #ff8acc); vertical-align: middle; margin-left: 4px;">
              <Female />
            </el-icon>
          </span>
        </div>
        <div>手机号: {{ friendBaseInfo?.phone }}</div>
        <div>邮箱: {{ friendBaseInfo?.email }}</div>
        <div>地址: {{ friendBaseInfo?.address }}</div>
        <div>生日: {{ friendBaseInfo?.birthday }}</div>
      </div>
      <div class="moments">
        朋友圈
      </div>
      <div class="button">
        <el-button @click="sendMessage">发消息</el-button>
        <el-button>语音聊天</el-button>
        <el-button>视频聊天</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { friendInfo } from '../../stores/modules/ContactListStore'
import { conversationInfo } from '../../stores/modules/ConversationStore'
import { Friend } from '../../types/friend'
import { getFriendInfoById, getConversationInfoById, updateConversation } from '../../db/dualDB'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()
let friendBaseInfo = ref<Friend>()

const sendMessage = async () => {
  const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
  const frinedId = friendBaseInfo.value?.friendId as number
  const conversationId = userId > frinedId
    ? userId + '_' + frinedId
    : frinedId + '_' + userId
  const conversationInfo = await getConversationInfoById(conversationId)
  conversationInfo.latestMsgTime = conversationInfo.latestMsgTime !== null ? dayjs(conversationInfo.latestMsgTime).format('HH:mm:ss') : undefined
  // 将信息添加到会话缓存中
  conversationStore.setConversationMap(conversationId, conversationInfo)
  // 修改会话的显示状态为1
  const condition = {
    id: conversationId
  }
  const data = {
    status: 1
  }
  updateConversation(condition, data)
  router.push({
    name: 'chat',
    // 传递会话id
    query: { conversationId: conversationId }
  })
}

const loadFriendInfo = async (friendId: any) => {
  // 获得好友的信息
  friendBaseInfo.value = await getFriendInfoById(friendId)
}

// 好友是否在线
const userOnlineStatus = computed(() => {
  return friendInfoStore.isUserOnline(route.query.friendId as string)
})

watch(
  // 第一个参数：要监听的“源”（可以是响应式变量、计算属性、路由参数等）
  () => route.query.friendId,
  (newVal: any, oldVal) => {
    loadFriendInfo(newVal)
  },
  { immediate: true }
)
</script>

<style scoped>
.friendInfo-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.userInfo {
  width: 660px;
  height: 580px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  background: rgba(70, 100, 130, 0.2);
  backdrop-filter: blur(12px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  gap: 8px;
  -webkit-app-region: no-drag;
}

.left-icon {
  position: absolute;
  top: 20px;
  right: 20px;
  -webkit-app-region: no-drag;
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

.left-icon:hover {
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.25);
}

.accountInfo {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  align-items: center;
}

img {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.accountInfo-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.accountInfo-info p,
.accountInfo-info span,
.online-status {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.accountInfo-info p {
  font-size: 18px;
  font-weight: 600;
}

.online-status {
  color: rgba(102, 217, 102, 0.9);
  font-weight: 500;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.online-status::before {
  content: '';
  background-color: rgba(102, 217, 102, 0.95);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  box-shadow: 0 0 4px rgba(102, 217, 102, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.offline-status {
  color: rgba(150, 150, 150, 0.9);
  font-weight: 500;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.offline-status::before {
  content: '';
  background-color: rgba(150, 150, 150, 0.95);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.baseInfo {
  width: 100%;
  height: 220px;
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.baseInfo div {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.5;
}

.baseInfo div::before {
  content: "• ";
  color: rgba(255, 255, 255, 0.5);
}

.moments {
  width: 100%;
  height: 140px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.button {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  /* 【新增】按钮间距 */
  padding: 0 10px;
}

.el-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.el-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
