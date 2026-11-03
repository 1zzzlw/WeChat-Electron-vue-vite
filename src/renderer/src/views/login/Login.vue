<template>
  <div class="login-count">
    <div class="auth-brand"><b>im</b><span>LUMINA / CONNECT</span></div>
    <div class="login-top">
      <h1 class="title">欢迎回来</h1>
      <p class="auth-subtitle">登录 Lumina，让对话继续。</p>
    </div>
    <div class="login-mid">
      <el-form label-position="top" class="login-form" :model="loginForm" ref="ruleFormRef" :rules="rules" @keyup.enter="handleEnterLogin">
        <el-form-item prop="account" label="账号">
          <el-input autocomplete="username" placeholder="请输入账号" v-model="loginForm.account" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password" label="密码">
          <el-input autocomplete="current-password" placeholder="请输入密码" type="password" v-model="loginForm.password" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="验证码" prop="verifyCode" class="login-verify">
          <el-input placeholder="请输入验证码" v-model="loginForm.verifyCode" spellcheck="false" clearable />
          <button type="button" class="verify-refresh" aria-label="刷新验证码" @click="refreshVerifyCode"><img :src="verifyCodeImg" alt="验证码" class="login-verifyImg" /></button>
        </el-form-item>
        <div class="login-form-button">
          <el-button type="primary" @click="Login(ruleFormRef)" :loading="isLoading">登录</el-button>
          <el-button @click="Register">注册账号</el-button>
        </div>
      </el-form>
    </div>
    <div class="login-bottom">
      欢迎回来，继续你的对话。
    </div>
  </div>
  <WindowControls :showSetTop="false" :showSetMiniSize="false" :showSetFullScreen="false" windowType="mainWindow" />
</template>

<script lang="ts" setup>
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { onMounted, reactive, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, verifyCodeApi } from '@/api/User'
import WindowControls from '@/components/WindowControls.vue'

onMounted(() => {
  refreshVerifyCode()
})

const router = useRouter()
const ruleFormRef = ref<FormInstance>()
const isLoading = ref(false)
const verifyCodeImg = ref('')

const refreshVerifyCode = async () => {
  try {
    // 关键：请求图片流必须指定 responseType: 'blob'
    const res = await verifyCodeApi({
      // 告诉 axios 接收二进制流
      responseType: 'blob'
    })
    // 把二进制流转成图片 URL
    verifyCodeImg.value = URL.createObjectURL(res as any)
  } catch (err) {
    console.error('获取验证码失败', err)
  }
}

const loginForm = reactive({
  account: '',
  password: '',
  verifyCode: ''
})

const rules = reactive<FormRules>({
  account: [{ required: true, message: '账号不能为空', trigger: 'change' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'change' }],
  verifyCode: [{ required: true, message: '验证码不能为空', trigger: 'change' }]
})

// 回车触发登录
const handleEnterLogin = () => {
  Login(ruleFormRef.value)
}

const Login = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  let removeInitListener: (() => void) | undefined
  try {
    // 验证成功会进入这里，失败会直接跳去 catch
    await formEl.validate()
    isLoading.value = true
    const result: any = await loginApi(loginForm)
    const status = result.code
    if (status === 1) {
      (window as any).userInfoApi.storeSetUserInfo('userId', result.data.id);
      (window as any).userInfoApi.storeSetUserInfo('avatar', result.data.avatar);
      (window as any).userInfoApi.storeSetUserInfo('username', result.data.username);
      (window as any).userInfoApi.storeSetUserInfo('phone', result.data.phone);
      (window as any).userInfoApi.storeSetUserInfo('account', result.data.account);
      (window as any).userInfoApi.storeSetUserInfo('gender', result.data.gender);

      // 先监听再打开加载窗口，避免快速点击“进入聊天”时丢失交接通知。
      const enterRequested = new Promise(resolve => {
        removeInitListener = (window as any).loadApi.onDataInitComplete(resolve)
      })
      const isNeed = await (window as any).loadApi.isNeedInitData()
      if (isNeed) {
        await enterRequested
      } else {
        await (window as any).dbApi.updateDBData()
      }
      await router.push('/main')
      await nextTick()
      await (window as any).windowToolApi.resizeWindow('main')
    } else {
      ElMessage.error(result.msg)
      isLoading.value = false
    }
  } catch (error) {
    console.log('error submit!', error)
    ElMessage.error('登录失败')
    isLoading.value = false
  } finally {
    removeInitListener?.()
  }
}

const Register = () => {
  router.push('/register');
  (window as any).windowToolApi.resizeWindow('register')
}
</script>

<style scoped>
@import '@/css/account.css';
.login-verify :deep(.el-form-item__content) { flex-wrap: nowrap; gap: 10px; }
.login-verify .el-input { flex: 1; min-width: 0; }
.verify-refresh { display: grid; place-items: center; width: 96px; height: 42px; overflow: hidden; border-radius: var(--radius-sm); background: var(--color-surface-2); cursor: var(--cursor-pointer, pointer); }
.login-verifyImg { width: 96px; height: 40px; object-fit: contain; }
</style>
