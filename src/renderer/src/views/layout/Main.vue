<template>
  <div class="main-count">
    <div class="main-count-left">
      <div class="main-count-left-top">
        <el-popover trigger="click" transition="user-card-pop" popper-class="user-card-popover"
          popper-style="width: 400px; height: 300px; padding: 0;" effect="dark" show-after="300" hide-after="150"
          placement="bottom" :offset="10" :persistent="false">
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
        <router-link tag="div" to="/collectList" class="left-icon">
          <el-icon size="30">
            <Star />
          </el-icon>
        </router-link>
        <router-link tag="div" to="/moments" class="left-icon">
          <div class="iconfont icon-pengyouquan"></div>
        </router-link>
      </div>
      <div class="main-count-left-bottom">
        <router-link tag="div" to="/wallet" class="left-icon">
          <el-icon size="28">
            <Wallet />
          </el-icon>
        </router-link>
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
import { ChatRound, UserFilled, Star, MoreFilled, Wallet } from '@element-plus/icons-vue'
import WindowControls from '../../components/WindowControls.vue'
import UserOnlineStatus from '../../components/UserOnlineStatus.vue'
import UserInfoCart from '../../components/UserInfoCart.vue'
import '../../assets/iconfont/iconfont.css'
import Notification from '../../components/NotificationContainer.vue'

const avatarUrl = ref('')
const containerRef = ref(null)

const openSettingView = () => {
  console.info('openSettingView');
  (window as any).windowToolApi.createNewWindow('settingView')
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar');

  // 进入main界面开始注册快捷键
  (window as any).windowToolApi.registerGlobalShortcut()
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
  will-change: transform, box-shadow, border-color, opacity;
}

.main-count-left-top-img:hover {
  opacity: 0.9;
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

/* 核心动画优化 - 更优雅的缓动+分层过渡 */
:global(.user-card-pop-enter-active) {
  transition:
    transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity 0.25s ease,
    box-shadow 0.3s ease;
}

:global(.user-card-pop-leave-active) {
  transition:
    transform 0.2s cubic-bezier(0.6, -0.28, 0.735, 0.045),
    opacity 0.2s ease,
    box-shadow 0.2s ease;
  will-change: transform, opacity, filter, box-shadow;
}

/* 入场起始态：更细腻的缩放+位移+透明度 */
:global(.user-card-pop-enter-from) {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
  filter: blur(2px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  will-change: transform, opacity, filter, box-shadow;
}

/* 入场结束态 */
:global(.user-card-pop-enter-to) {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.25);
  transform: translateY(-2px) scale(1);
}

/* 离场结束态 */
:global(.user-card-pop-leave-to) {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
  filter: blur(1px);
}

/* 优化popover容器样式，贴合整体界面风格 */
:global(.user-card-popover) {
  background: rgba(20, 24, 32, 0.65) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  /* 【优化8】增加轻微的边框发光，贴合头像的光效风格 */
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3), 0 0 15px rgba(66, 153, 225, 0.1) !important;
}

/* 优化掉小箭头 */
:global(.user-card-popover .el-popper__arrow::before) {
  background: rgba(20, 24, 32, 0.65) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  /* 【优化9】给箭头增加轻微模糊，和容器风格统一 */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* 增加popover的hover效果，强化交互 */
:global(.user-card-popover:hover) {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.35), 0 0 20px rgba(66, 153, 225, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s ease;
}
</style>
