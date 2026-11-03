<template>
  <div class="pending-login-count">
    <div class="auth-brand"><b>im</b><span>LUMINA / CONNECT</span></div>
    <div class="pending-login-top">
      <h1 class="title">继续你的对话</h1>
      <p class="auth-subtitle">检测到上次登录账号</p>
    </div>
    <div class="pending-login-mid">
      <img :src="avatarUrl" alt="avatar" class="avatar" />
    </div>
    <div class="pending-login-bottom">
      <el-button @click="returnLogin">其他账号</el-button>
      <el-button type="primary" @click="confirmLogin" :loading="isLoading">确认登录</el-button>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { PendingLoginApi } from '@/api/User'

const router = useRouter()
const isLoading = ref(false)
const avatarUrl = ref('')

const returnLogin = () => {
  router.push('/login')
}

const confirmLogin = async () => {
  isLoading.value = true
  const token = await window.userInfoApi.storeGetUserInfo('token')
  const userId = await window.userInfoApi.storeGetUserInfo('userId')
  const res = await PendingLoginApi(token, userId)
  if (res.code === 1) {
    // 等待更新成功的通知
    console.info('响应成功')
    await window.dbApi.updateDBData()
    await router.push('/main')
    await nextTick()
    await window.windowToolApi.resizeWindow('main')
  } else {
    ElMessage.error('登录过期，重新登录', res.msg)
    await router.push('/login')
    await window.windowToolApi.resizeWindow('login')
  }
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
})
</script>

<style scoped>
@import '@/css/account.css';
.pending-login-mid { display: grid; place-items: center; padding: 24px 0; }
.avatar { width: 104px; height: 104px; object-fit: cover; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle); }
</style>
