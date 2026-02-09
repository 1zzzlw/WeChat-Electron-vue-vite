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
          <el-icon size="30">
            <ChatRound />
          </el-icon>
        </router-link>
        <router-link tag="div" to="/list" class="left-icon">
          <el-icon size="30">
            <UserFilled />
          </el-icon>
        </router-link>
        <router-link tag="div" to="/collect" class="left-icon">
          <el-icon size="30">
            <Star />
          </el-icon>
        </router-link>
        <router-link tag="div" to="/moments" class="left-icon">
          <div class="iconfont icon-pengyouquan"></div>
        </router-link>
      </div>
      <div class="main-count-left-bottom">
        <el-icon class="left-icon" size="30" @click="openSettingView">
          <MoreFilled />
        </el-icon>
      </div>
    </div>
    <div class="main-count-right">
      <router-view></router-view>
    </div>
  </div>
  <WindowControls windowType="mainWindow" />
  <Notification />
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import WindowControls from '../../components/WindowControls.vue'
import UserOnlineStatus from '../../components/UserOnlineStatus.vue'
import UserInfoCart from '../../components/UserInfoCart.vue'
import '../../assets/iconfont/iconfont.css'
import Notification from '../../components/Notification.vue'

const avatarUrl = ref('')

const openSettingView = () => {
  console.info('openSettingView');
  (window as any).windowToolApi.createNewWindow('settingView')
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
  // WSManager.connect().then((r) => { })
})
</script>

<style scoped>
.main-count {
  display: flex;
  width: 100%;
  height: 100%;
}

.main-count-left {
  display: flex;
  /*垂直方向布局*/
  flex-direction: column;
  justify-content: space-between;
  width: 80px;
  background: rgba(22, 28, 36, 0.2);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(66, 153, 225, 0.2);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 0 8px rgba(179, 200, 255, 0.6),
    0 0 20px rgba(120, 140, 255, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid rgba(179, 200, 255, 0.3);
}

.main-count-left-top-img:hover {
  opacity: 0.8;
  box-shadow: 0 0 15px rgba(179, 200, 255, 0.8),
    0 0 30px rgba(120, 140, 255, 0.6);
  transform: scale(1.05);
  border-color: rgba(179, 200, 255, 0.6);
}

.left-icon {
  margin-bottom: 10px;
  /*鼠标移动到这里时变成手*/
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(240, 240, 240, 0.8);
}

.iconfont {
  font-size: 30px;
  margin-bottom: 10px;
  text-decoration: none;
  /* 继承父元素的过渡动画 */
  transition: inherit;
}

.left-icon:hover {
  opacity: 1;
  color: rgba(66, 153, 225, 0.9);
  transform: scale(1.08);
  text-shadow: 0 0 8px rgba(66, 153, 225, 0.4);
}

.main-count-right {
  flex: 1;
}
</style>
