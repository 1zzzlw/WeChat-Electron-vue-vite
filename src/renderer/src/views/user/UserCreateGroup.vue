<template>
  <div class="createGroup-count">
    <div class="count-left">
      <div class="title">联系人</div>
      <div class="contact-list">
        <el-scrollbar>
          <div v-for="friend in friendList.list" :key="friend.friendId" class="scrollbar-demo-item">
            <div class="left-info">
              <img :src="friend.avatar" alt="头像" class="left-list-img" />
              <div class="friend-name">{{ friend.username }}</div>
            </div>
            <div class="right-btn">
              <el-button type="primary" class="invite-btn" @click="inviteBtn(friend)">添加</el-button>
              <el-button type="danger" class="remove-btn" @click="removeBtn(friend)">移除</el-button>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
    <div class="count-right">
      <div class="title">选择联系人: {{ count }}</div>
      <div class="invited-list">
        <el-scrollbar>
          <div v-for="(friend, index) in invitedList.list" :key="index" class="scrollbar-right-item">
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
    <WindowControls :showSetFullScreen="false" windowType="createGroup" />
  </div>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { sendGroupApplyApi } from '@/api/Conversation'
import WindowControls from '@/components/WindowControls.vue'
import { addConversation, getFriendList } from '@/db/dualDB'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { Conversation } from '@/types/conversation'

const count = ref(0)
const friendList = reactive<any>({ list: [] })
const invitedList = reactive<any>({ list: [] })
const conversationStore = conversationInfo()
// hash 集合，用于存储已邀请用户的 ID
const invitedIds = ref(new Set())
const groupName = ref('')

const inviteBtn = (friend: any) => {
  if (invitedIds.value.has(friend.friendId)) {
    ElMessage.error('该用户已被邀请')
    return
  }
  if (count.value <= 200) {
    count.value++
  }
  // 加入已邀请用户 ID 集合
  invitedIds.value.add(friend.friendId)
  invitedList.list.push(friend)
  ElMessage.success('添加成功')
}

const removeBtn = (friend: any) => {
  if (!invitedIds.value.has(friend.friendId)) {
    ElMessage.error('该用户未被邀请')
    return
  }
  if (count.value > 0) {
    count.value--
  }
  // 从已邀请列表中移除
  // 从已邀请用户 ID 集合中移除
  invitedIds.value.delete(friend.friendId)
  invitedList.list = invitedList.list.filter((item: any) => item.friendId !== friend.friendId)
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

  // 制作群聊头像
  const arrayBuffer = await (window as any).mediaHandleApi.generateGroupAvatar()
  const avatarBlob = new Blob([arrayBuffer])

  // 将 Set 转换为数组
  const invitedIdsArray = [...invitedIds.value]

  const formData = new FormData()

  formData.append('groupAvatar', avatarBlob)
  formData.append('groupName', groupName.value)

  invitedIdsArray.forEach(id => formData.append('invitedIds', id as string));

  const result: any = await sendGroupApplyApi(formData)
  if (result.code === 1) {
    ElMessage.success('创建群聊成功')
    const conversationInfo: Conversation = result.data

    // 跨组间通信，实时更新会话列表
    conversationStore.setConversationMap(conversationInfo.id, conversationInfo)
    // 将创建的群会话列表存入本地
    addConversation(conversationInfo);

    (window as any).windowToolApi.destroyNewWindow('createGroup')
  } else {
    ElMessage.error(result.msg)
  }
}

onMounted(() => {
  getFriendList().then((res) => {
    friendList.list = res
  })
})
</script>

<style scoped>
.title {
  -webkit-app-region: drag;
  color: #f0f4f8;
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0;
}

.createGroup-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  background: rgba(43, 62, 73, 0.85);
  backdrop-filter: blur(20px);
  color: #e0e6ed;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.count-left {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0 16px;
}

.contact-list {
  width: 85%;
  height: 85%;
  background: rgba(135, 206, 235, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 30px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.scrollbar-demo-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.scrollbar-demo-item:hover {
  background: rgba(255, 255, 255, 0.08);
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
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.friend-name {
  font-size: 16px;
  margin-left: 12px;
  color: #e0e6ed;
  font-weight: 500;
}

.right-btn {
  display: flex;
  gap: 8px;
}

/* 添加按钮：适配淡蓝色半透明风格，与添加好友界面一致 */
.invite-btn {
  background: rgba(100, 181, 246, 0.2);
  border: 1px solid rgba(100, 181, 246, 0.3);
  color: #e0e6ed;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.invite-btn:hover {
  background: rgba(100, 181, 246, 0.3);
  border-color: rgba(100, 181, 246, 0.5);
  color: #fff;
}

.remove-btn {
  background: rgba(245, 108, 108, 0.2);
  border: 1px solid rgba(245, 108, 108, 0.3);
  color: #e0e6ed;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: rgba(245, 108, 108, 0.3);
  border-color: rgba(245, 108, 108, 0.5);
  color: #fff;
}

.count-right {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.invited-list {
  width: 85%;
  height: 85%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  background: rgba(135, 206, 235, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 30px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.scrollbar-right-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.scrollbar-right-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.create-group-btn {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  gap: 12px;
  padding: 0 16px;
}

/* 输入框：适配毛玻璃背景 */
.create-group-btn :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow: none;
  transition: all 0.2s ease;
}

.create-group-btn :deep(.el-input__wrapper):hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.create-group-btn :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(100, 181, 246, 0.6);
  box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.15);
}

.create-group-btn :deep(.el-input__inner) {
  color: #e0e6ed;
}

/* 创建群聊按钮：适配淡蓝色半透明风格，与添加好友界面一致 */
.create-btn {
  background: rgba(100, 181, 246, 0.2);
  border: 1px solid rgba(100, 181, 246, 0.3);
  color: #e0e6ed;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.create-btn:hover {
  background: rgba(100, 181, 246, 0.3);
  border-color: rgba(100, 181, 246, 0.5);
  color: #fff;
}
</style>
