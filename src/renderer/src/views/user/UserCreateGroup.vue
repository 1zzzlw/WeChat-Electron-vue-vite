<template>
  <div class="createGroup-count">
    <div class="count-left">
      <div class="title">联系人</div>
      <div class="contact-list">
        <el-scrollbar>
          <div v-for="(friend, index) in friendList.list" :key="index" class="scrollbar-demo-item">
            <div class="left-info">
              <img :src="friend.avatar" alt="头像" class="left-list-img" />
              <div class="friend-name">{{ friend.username }}</div>
            </div>
            <div class="right-btn">
              <el-button type="primary" class="invite-btn" @click="inviteBtn(friend)"
                >添加</el-button
              >
              <el-button type="danger" class="remove-btn" @click="removeBtn(friend)"
                >移除</el-button
              >
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
    <div class="count-right">
      <div class="title">选择联系人: {{ count }}</div>
      <div class="invited-list">
        <el-scrollbar>
          <div
            v-for="(friend, index) in invitedList.list"
            :key="index"
            class="scrollbar-right-item"
          >
            <div class="left-info">
              <img :src="friend.avatar" alt="头像" class="left-list-img" />
              <div class="friend-name">{{ friend.username }}</div>
            </div>
          </div>
        </el-scrollbar>
        <div class="create-group-btn">
          <el-input v-model="groupName" placeholder="请输入群聊名称" clearable></el-input>
          <el-button type="primary" class="create-btn" @click="createGroup">创建群聊</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { getFriendListApi } from '../../api/Friend'
import { sendGroupApplyApi } from '../../api/Apply'
import { ElMessage } from 'element-plus'

const count = ref(0)
const friendList = reactive({ list: [] })
const invitedList = reactive({ list: [] })
// hash 集合，用于存储已邀请用户的 ID
const invitedIds = ref(new Set())
const groupName = ref('')
const userAvatar = ref('')

const inviteBtn = (friend) => {
  if (invitedIds.value.has(friend.id)) {
    ElMessage.error('该用户已被邀请')
    return
  }
  if (count.value <= 200) {
    count.value++
  }
  // 加入已邀请用户 ID 集合
  invitedIds.value.add(friend.id)
  invitedList.list.push(friend)
  ElMessage.success('添加成功')
}

const removeBtn = (friend) => {
  if (!invitedIds.value.has(friend.id)) {
    ElMessage.error('该用户未被邀请')
    return
  }
  if (count.value > 0) {
    count.value--
  }
  // 从已邀请列表中移除
  // 从已邀请用户 ID 集合中移除
  invitedIds.value.delete(friend.id)
  invitedList.list = invitedList.list.filter((item) => item.id !== friend.id)
  ElMessage.success('已移除该用户')
}

const createGroup = async () => {
  if (invitedList.list.length === 0) {
    ElMessage.error('请邀请至少一个用户')
    return
  }
  if (groupName.value === '') {
    ElMessage.error('请输入群聊名称')
    return
  }
  // 获取当前用户头像
  userAvatar.value = await window.api.storeGetAvatar()
  // 将 Set 转换为数组
  const invitedIdsArray = [...invitedIds.value]
  console.info(invitedIdsArray)
  sendGroupApplyApi(invitedIdsArray, groupName.value)
    .then((res) => {
      if (res.code === 1) {
        ElMessage.success('创建群聊成功')
        // ws 发送创建群聊成功消息
        window.api.sendToMain(7, 0, {
          userAvatar: userAvatar.value,
          groupName: groupName.value,
          invitedIds: invitedIdsArray
        })
        window.api.destroyNewWindow('createGroup')
      } else {
        ElMessage.error(res.msg)
      }
    })
    .catch((err) => {
      ElMessage.error('创建群聊失败')
    })
}

onMounted(() => {
  getFriendListApi().then((res) => {
    friendList.list = res.data
  })
})
</script>

<style scoped>
.title {
  -webkit-app-region: drag;
}

.createGroup-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  background-color: #2b3e49;
}

.count-left {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-right: 1px solid #ffffff;
}

.contact-list {
  width: 85%;
  height: 85%;
  background-color: #67c23a;
  border-radius: 5px;
  margin-bottom: 30px;
  overflow: hidden;
}

.scrollbar-demo-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 10px;
}

.left-info {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.left-list-img {
  width: 50px;
  height: 50px;
  border-radius: 5px;
}

.friend-name {
  font-size: 16px;
  margin-left: 10px;
}

.count-right {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.invited-list {
  width: 85%;
  height: 85%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  background-color: #67c23a;
  border-radius: 5px;
  margin-bottom: 30px;
  overflow: hidden;
}

.scrollbar-right-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 10px;
}

.create-group-btn {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
</style>
