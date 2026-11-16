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
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PendingLoginApi } from '@/api/User'
import { enterAccount } from '@/utils/enterAccount'

const router = useRouter()
const isLoading = ref(false)
const avatarUrl = ref('')

const returnLogin = async () => {
  await window.accountApi.switchAccount()
}

const confirmLogin = async () => {
  if (isLoading.value) return
  isLoading.value = true
  try {
    const userId = await window.userInfoApi.storeGetUserInfo('userId')
    const res = await PendingLoginApi(userId)
    if (res.code === 1) await enterAccount(router)
    else {
      ElMessage.warning(res.msg || '登录过期，请重新登录')
      if (res.requiresPassword) await returnLogin()
    }
  } catch {
    ElMessage.error('连接服务失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  // 从本地存储中获取头像
  avatarUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
})
</script>

<style scoped>
@import '@/css/account.css';
.pending-login-mid {
  display: grid;
  place-items: center;
  padding: 24px 0;
}
.avatar {
  width: 104px;
  height: 104px;
  object-fit: cover;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
}
</style>
