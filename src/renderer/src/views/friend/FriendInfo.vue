<template>
  <div class="friendInfo-count">
    <div class="userInfo">
      <div class="accountInfo">
        <img :src="friendBaseInfo?.avatar" alt="">
        <div class="accountInfo-info">
          <p>用户名: {{ friendBaseInfo?.username }}</p>
          <span>账号: {{ friendBaseInfo?.account }} </span>
          <!-- <div class="online-status">在线</div> -->
          <div class="offline-status">离线</div>
        </div>
      </div>
      <div class="baseInfo">
        <div>备注</div>
        <div>性别: {{ friendBaseInfo?.gender }}</div>
        <div>手机号: {{ friendBaseInfo?.phone }}</div>
        <div>邮箱</div>
        <div>地址</div>
        <div>生日</div>
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
import { watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Friend } from '../../types/friend'
import { getFriendInfoById } from '../../db/dualDB'

const route = useRoute()
const router = useRouter()
let friendBaseInfo = ref<Friend>()

const sendMessage = async () => {
  const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
  const frinedId = friendBaseInfo.value?.friendId as number
  const conversationId = userId > frinedId
    ? userId + '_' + frinedId
    : frinedId + '_' + userId
  router.push({
    name: 'chat',
    // 传递会话id
    query: { conversationId: conversationId }
  })
}

const loadFriendInfo = async (friendId: any) => {
  const result = await getFriendInfoById(friendId)
  friendBaseInfo.value = result[0]
}

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

.accountInfo {
  width: 100%;
  height: 120px;
  display: flex;
  gap: 20px;
  padding: 10px;
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
