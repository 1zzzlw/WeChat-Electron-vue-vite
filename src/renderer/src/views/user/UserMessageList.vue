<template>
  <div class="user-message-list">
    <div class="user-message-list-left">
      <div class="message-list-top">
        <el-input style="width: 240px" placeholder="搜索" :prefix-icon="Search" />
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
            v-for="(user, index) in friendList.arr"
            :key="index"
            :class="{ 'left-list-bg': active == user.id }"
            @click="starCall(user)"
          >
            <div class="left-image">
              <img :src="user.avatar" alt="头像" class="left-list-img" />
            </div>
            <div class="mid-message">
              <h1 class="friend-name">{{ user.username }}</h1>
              <div class="friend-message">你好</div>
            </div>
            <div class="right-count">
              <div class="left-list-time">6:00</div>
              <div class="left-list-count"></div>
              <div class="user-status"></div>
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, ArrowDown } from '@element-plus/icons-vue'
import { getFriendListApi } from '../../api/Friend'

const router = useRouter()
const friendList = reactive({ arr: [] })
const active = ref('')

const starCall = (user) => {
  active.value = user.id
  router.push({ path: '/chat', query: { friendId: user.id } })
}

const createGroupChat = () => {
  console.info('createGroupChat')
}

const addFriend = () => {
  console.info('addFriend')
  // 打开添加好友窗口
  window.api.createNewWindow('addFriend')
}

onMounted(() => {
  getFriendListApi().then((res) => {
    console.info('好友列表:', res.data)
    friendList.arr = res.data
  })
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
  font-size: 14px;
  color: #9f9f9f;
  margin: 0;
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
