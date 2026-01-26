<template>
  <div class="pending-login-count">
    <span></span>
    <div class="pending-login-top">
      <div class="pending-login-title">检测到上次登录账号</div>
    </div>
    <div class="pending-login-mid">
      <img :src="avatarUrl" alt="avatar" class="avatar" />
    </div>
    <div class="pending-login-bottom">
      <el-button type="primary" @click="returnLogin">返回登录</el-button>
      <el-button type="primary" @click="confirmLogin">确认登录</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PendingLoginApi } from '../../api/Login'
import { ElMessage } from 'element-plus'

const router = useRouter()

const avatarUrl = ref('')

const returnLogin = () => {
  router.push('/login')
}

const confirmLogin = async () => {
  const token = await window.userInfoApi.storeGetUserInfo('token')
  const userId = await window.userInfoApi.storeGetUserInfo('userId')
  const res = await PendingLoginApi(token, userId)
  if (res.code === 1) {
    // 等待更新成功的通知
    console.info('响应成功')
    await window.dbApi.updateDBData()
    await window.windowToolApi.resizeWindow('main')
    await router.push('/main')
  } else {
    ElMessage.error('登录过期，重新登录')
  }
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
})
</script>

<style scoped>
@import '../../css/account.css';

.pending-login-top {
  text-align: center;
  margin-bottom: 20px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-style: italic;
  color: #ffffff;
  font-weight: 500;
  text-shadow:
    0 0 8px rgba(179, 200, 255, 0.5),
    0 0 20px rgba(120, 140, 255, 0.3);
  animation: titleFadeIn 2s ease forwards;
}

.pending-login-mid {
  display: flex;
  justify-content: center;
  margin: 30px 0 50px;
  perspective: 500px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  /* 初始轻微缩放，加载后放大 */
  transform: scale(0.95);
  animation: avatarShow 1.2s ease 0.2s forwards;
  -webkit-app-region: no-drag;
}

/* 头像加载动画 */
@keyframes avatarShow {
  to {
    transform: scale(1.2);
  }
}

/* 头像悬浮效果：放大+轻微旋转+增强阴影 */
.avatar:hover {
  transform: scale(1.8) rotate(2deg);
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.3);
  /* 加淡蓝色阴影呼应头像色调 */
}

.pending-login-bottom {
  -webkit-app-region: no-drag;
}

/* 标题渐显动画（复用之前逻辑） */
@keyframes titleFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
