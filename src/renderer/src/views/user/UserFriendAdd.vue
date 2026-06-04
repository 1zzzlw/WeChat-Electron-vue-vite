<template>
  <div class="friendAdd-count">
    <div class="title">添加好友</div>
    <div class="friendAdd-top">
      <el-input style="width: 240px" placeholder="搜索微信号或者手机号" v-model="searchInput" :prefix-icon="Search"
        spellcheck="false" clearable />
      <el-button type="success" @click="searchUser">搜索</el-button>
    </div>
    <div class="friendAdd-bottom">
      <div class="friend-baseInfo" v-if="userInfo.isFriend === 1">
        <div class="friend-info-top">
          <img :src="userInfo.avatar" alt="" />
          <div class="friend-info">
            <div class="friend-name">{{ userInfo.username }}</div>
            <div class="friend-account">账号：{{ userInfo.account }}</div>
            <div class="friend-address">地址：{{ userInfo.address }}</div>
          </div>
        </div>
        <div class="friend-other">
          <div class="friend-remark">备注：{{ userInfo.remark }}</div>
          <div class="friend-circle">朋友圈</div>
          <div class="common-friend">共同好友</div>
          <div class="friend-signature">个性签名</div>
        </div>
        <div class="friend-button">
          <el-button type="primary">发消息</el-button>
          <el-button type="primary">语音聊天</el-button>
          <el-button type="primary">视频通话</el-button>
        </div>
      </div>

      <div class="newFriend" v-else-if="userInfo.isFriend === 0">
        <div class="newFriend-baseInfo">
          <img :src="userInfo.avatar" alt="头像" />
          <div>{{ userInfo.username }}</div>
        </div>
        <div class="apply-message">
          <el-input v-model="applyMessage" maxlength="50" style="width: 100%" resize="none" placeholder="请输入添加好友的消息"
            show-word-limit type="textarea" :rows="4" spellcheck="false" clearable />
        </div>
        <el-button type="primary" @click="sendApply">添加好友</el-button>
      </div>
    </div>
    <WindowControls :showSetFullScreen="false" windowType="friendAdd" />
  </div>
</template>

<script lang="ts" setup>
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { sendApplyApi } from '../../api/Apply'
import { searchFriendApi } from '../../api/User'
import WindowControls from '../../components/WindowControls.vue'

const applyMessage = ref('')
const searchInput = ref('')
const userInfo = reactive({
  id: '',
  username: '',
  account: '',
  avatar: '',
  gender: '',
  remark: '',
  address: '',
  isFriend: null
})

const applyInfo = reactive({
  toUserId: '',
  applyMsg: ''
})

const searchUser = () => {
  if (searchInput.value === '') {
    ElMessage.error('输入框为空')
    return
  }
  console.info(searchInput.value)
  searchFriendApi(searchInput.value).then((res) => {
    userInfo.id = res.data.id
    userInfo.username = res.data.username
    userInfo.account = res.data.account
    userInfo.avatar = res.data.avatar
    userInfo.gender = res.data.gender
    userInfo.remark = res.data.remark
    userInfo.address = res.data.address
    userInfo.isFriend = res.data.isFriend
  })
}

const sendApply = async () => {
  applyInfo.toUserId = userInfo.id
  applyInfo.applyMsg = applyMessage.value
  const res: any = await sendApplyApi(applyInfo)
  console.info(res)
  const applyId = res.data
  console.info(applyId)
  if (res.code === 1) {
    ElMessage.success(`发送好友申请成功`)
    console.info('好友申请表ID：' + applyId);
    // 发送好友申请，成功后，通知对方好友申请列表更新
    (window as any).wsApi.sendMessage(5, 0, {
      applyId: applyId,
      toUserId: applyInfo.toUserId,
      applyMsg: applyInfo.applyMsg,
    })
  } else {
    ElMessage.error('发送好友申请失败')
  }
}

// 添加监听，当输入框清空时重置isFriend状态
watch(searchInput, (newValue) => {
  if (newValue === '') {
    // 重置用户信息状态
    userInfo.isFriend = null
  }
})
</script>

<style scoped>
.title {
  font-weight: 600;
  text-align: center;
  -webkit-app-region: drag;
}

.friendAdd-count {
  /* 设置宽度和高度，确保有足够空间展示居中效果 */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 20px;
  background: rgba(43, 62, 73, 0.85);
  backdrop-filter: blur(20px);
  color: #e0e6ed;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.friendAdd-top {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  margin-bottom: 20px;
}

.friendAdd-top :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow: none;
  transition: all 0.2s ease;
}

.friendAdd-top :deep(.el-input__wrapper):hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.friendAdd-top :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(100, 181, 246, 0.6);
  box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.15);
}

.friendAdd-top :deep(.el-input__inner) {
  color: #e0e6ed;
}

.friendAdd-top :deep(.el-input__prefix) {
  color: rgba(224, 230, 237, 0.6);
}

.friendAdd-top .el-button {
  background: rgba(100, 181, 246, 0.8);
  border: 1px solid rgba(100, 181, 246, 0.4);
  color: #fff;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.friendAdd-top .el-button:hover {
  background: rgba(100, 181, 246, 0.9);
  border-color: rgba(100, 181, 246, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}

.friendAdd-top .el-button:active {
  transform: translateY(0);
}

.friendAdd-bottom {
  height: 100%;
  display: flex;
  border-top: 1px solid #ffffff;
  -webkit-app-region: no-drag;
}

.friend-baseInfo {
  width: 100%;
  height: 95%;
  margin-top: 20px;
  padding: 20px;
  background: rgba(135, 206, 235, 0.15);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.friend-info-top {
  width: 100%;
  height: 70px;
  display: flex;
  gap: 20px;
  border-bottom: 1px solid #ffffff;
}

.friend-info {
  font-size: 14px;
  white-space: nowrap;
}

.friend-name {
  font-size: 16px;
  font-weight: bold;
}

.friend-other {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.friend-button {
  display: flex;
  margin-top: 24px;
}

.friend-button .el-button {
  background: rgba(100, 181, 246, 0.2);
  border: 1px solid rgba(100, 181, 246, 0.3);
  color: #e0e6ed;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.friend-button .el-button:hover {
  background: rgba(100, 181, 246, 0.3);
  border-color: rgba(100, 181, 246, 0.5);
  color: #fff;
}

.newFriend {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 30px;
}

.newFriend-baseInfo {
  display: flex;
  gap: 20px;
  align-items: center;
  font-size: 16px;
  margin-bottom: 50px;
}

img {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.apply-message :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #e0e6ed;
  resize: none;
  transition: all 0.2s ease;
}

.apply-message :deep(.el-textarea__inner):focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(100, 181, 246, 0.6);
  box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.15);
}

.apply-message :deep(.el-input__count) {
  color: rgba(224, 230, 237, 0.6);
  background: none;
}

.newFriend .el-button {
  height: 40px;
  margin-top: 40px;
  background: rgba(100, 181, 246, 0.2);
  border: 1px solid rgba(100, 181, 246, 0.3);
  color: #fff;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.newFriend .el-button:hover {
  background: rgba(100, 181, 246, 0.3);
  border-color: rgba(100, 181, 246, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}
</style>
