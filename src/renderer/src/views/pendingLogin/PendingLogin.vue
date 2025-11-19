<template>
  <div class="pending-login-count">
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
import { WSManager } from '../../utils/websocket'

const router = useRouter()

const avatarUrl = ref('')

const returnLogin = () => {
  router.push('/login')
}

const confirmLogin = async () => {
  const token = await window.api.storeGetToken()
  const res = await PendingLoginApi(token)
  if (res.code === 1) {
    await router.push('/main')
    await WSManager.connect()
    window.api.resizeWindow('main')
  } else {
    ElMessage.error('登录过期，重新登录')
  }
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await window.api.storeGetAvatar()
})
</script>

<style scoped>
.pending-login-count {
  /* 设置宽度和高度，确保有足够空间展示居中效果 */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #2b3e49;
  padding: 20px;
  -webkit-app-region: drag;
}

.pending-login-top {
  text-align: center;
  margin-bottom: 20px;
}

.pending-login-mid {
  display: flex;
  justify-content: center;
  margin-bottom: 50px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

.pending-login-bottom {
  display: flex;
  justify-content: space-around;
  -webkit-app-region: no-drag;
}

.pending-login-bottom button {
  width: 50%;
}
</style>
