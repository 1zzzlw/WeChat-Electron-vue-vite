<template>
  <div class="friendAdd-count">
    <div class="title">添加好友</div>
    <div class="friendAdd-top">
      <el-input
        style="width: 240px"
        placeholder="搜索微信号或者手机号"
        v-model="searchInput"
        :prefix-icon="Search"
        spellcheck="false"
        clearable
      />
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
          <el-input
            v-model="applyMessage"
            maxlength="50"
            style="width: 100%"
            resize="none"
            placeholder="请输入添加好友的消息"
            show-word-limit
            type="textarea"
            :rows="4"
            spellcheck="false"
            clearable
          />
        </div>
        <el-button type="primary" @click="sendApply">添加好友</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue'
import { sendApplyApi } from '../../api/Apply'
import { searchFriendApi } from '../../api/Friend'
import { WSManager } from '../../utils/websocket.js'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

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

const sendApply = () => {
  applyInfo.toUserId = userInfo.id
  applyInfo.applyMsg = applyMessage.value
  const res = sendApplyApi(applyInfo)
  console.info(res)
  const applyId = res.data
  console.info(applyId)
  if (res.code === 1) {
    ElMessage.success(`发送好友申请成功`)
    console.info('好友申请表ID：' + applyId)
    // 发送好友申请成功后，通知对方好友申请列表更新
    WSManager.sendMessage(5, 0, {
      applyId: applyId,
      toUserId: applyInfo.toUserId,
      applyMsg: applyInfo.applyMsg
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
  font-weight: bold;
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
  background-color: #2b3e49;
  padding: 20px;
}

.friendAdd-top {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
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
  background-color: skyblue;
  border-radius: 10px;
}

.friend-info-top {
  width: 100%;
  height: 70px;
  display: flex;
  gap: 30px;
  border-bottom: 1px solid #ffffff;
}

.friend-info {
  font-size: 14px;
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
  margin-top: 20px;
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
  margin-bottom: 50px;
}

img {
  width: 60px;
  height: 60px;
  border-radius: 10px;
}

.newFriend button {
  height: 40px;
  margin-top: 40px;
}
</style>
