<template>
  <div class="main-count">
    <div class="main-count-left">
      <div class="main-count-left-top">
        <el-popover popper-style="width: 400px; height: 300px; padding: 0;" show-after="500">
          <UserInfoCart />
          <template #reference>
            <img :src="avatarUrl" alt="头像" class="main-count-left-top-img" />
          </template>
        </el-popover>
        <UserOnlineStatus />
        <router-link tag="div" to="/messageList" class="left-icon">
          <el-icon size="30"><ChatRound /></el-icon>
        </router-link>
        <router-link tag="div" to="/list" class="left-icon">
          <el-icon size="30"><UserFilled /></el-icon>
        </router-link>
        <router-link tag="div" to="/collect" class="left-icon">
          <el-icon size="30"><Star /></el-icon>
        </router-link>
        <router-link tag="div" to="/moments" class="left-icon">
          <div class="iconfont icon-pengyouquan"></div>
        </router-link>
      </div>
      <div class="main-count-left-bottom">
        <el-icon style="cursor: pointer" size="30" @click="openSettingView"><MoreFilled /></el-icon>
      </div>
    </div>
    <div class="main-count-right">
      <router-view></router-view>
    </div>
  </div>
  <WindowControls />
  <Notification />
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { WSManager } from '../../utils/websocket'
import WindowControls from '../../components/WindowControls.vue'
import UserOnlineStatus from '../../components/UserOnlineStatus.vue'
import UserInfoCart from '../../components/UserInfoCart.vue'
import '../../assets/iconfont/iconfont.css'
import Notification from '../../components/Notification.vue'

const avatarUrl = ref('')

const openSettingView = () => {
  console.info('openSettingView')
  window.api.createNewWindow('settingView')
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await window.api.storeGetAvatar()
  WSManager.connect().then((r) => {})
})
</script>

<style scoped>
.main-count {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.main-count-left {
  display: flex;
  /*垂直方向布局*/
  flex-direction: column;
  justify-content: space-between;
  width: 80px;
  background: #242424;
}

.main-count-left-top {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.main-count-left-bottom {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.main-count-left-top-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  margin: 15px;
}

.left-icon {
  margin-bottom: 10px;
  /*鼠标移动到这里时变成手*/
  cursor: pointer;
}

.iconfont {
  font-size: 30px;
  margin-bottom: 10px;
  text-decoration: none;
}

.left-icon:hover {
  opacity: 0.5;
}

.main-count-right {
  flex: 1;
  background: red;
}
</style>
