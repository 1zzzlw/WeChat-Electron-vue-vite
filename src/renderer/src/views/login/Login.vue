<template>
  <div class="login-count">
    <div class="auth-brand"><b>im</b><span>LUMINA / CONNECT</span></div>
    <div class="login-top">
      <h1 class="title">欢迎回来</h1>
      <p class="auth-subtitle">登录 Lumina，让对话继续。</p>
    </div>
    <div class="login-mid">
      <el-form
        label-position="top"
        class="login-form"
        :model="loginForm"
        ref="ruleFormRef"
        :rules="rules"
        @keyup.enter="handleEnterLogin"
      >
        <el-form-item prop="account" label="账号">
          <el-input
            autocomplete="username"
            placeholder="请输入账号"
            v-model="loginForm.account"
            spellcheck="false"
            clearable
          >
            <template #prepend>
              <el-icon>
                <User />
              </el-icon>
            </template>
            <template #suffix>
              <el-popover
                v-model:visible="showRecentAccounts"
                placement="bottom-end"
                trigger="click"
                width="auto"
                :disabled="isLoading"
              >
                <template #reference>
                  <button
                    type="button"
                    class="recent-toggle"
                    aria-label="选择历史账号"
                    :aria-expanded="showRecentAccounts"
                    :disabled="isLoading"
                    @keyup.enter.stop
                  >
                    <el-icon :class="{ 'is-open': showRecentAccounts }"><ArrowDown /></el-icon>
                  </button>
                </template>
                <section aria-label="本机最近登录账号">
                  <p class="recent-title">最近登录</p>
                  <div v-if="recentAccounts.length" class="recent-list">
                    <div v-for="account in recentAccounts" :key="account.userId" class="recent-row">
                      <button
                        type="button"
                        class="recent-account"
                        :disabled="isLoading"
                        @click="selectAccount(account)"
                      >
                        <img v-if="account.avatar" :src="account.avatar" alt="" />
                        <span v-else class="account-initial">{{
                          (account.username || account.account).slice(0, 1)
                        }}</span>
                        <span class="recent-info"
                          ><b>{{ account.username || account.account }}</b
                          ><small
                            >{{ account.account }} ·
                            {{ account.canQuickLogin ? '点击登录' : '需输入密码' }}</small
                          ></span
                        >
                      </button>
                      <button
                        type="button"
                        class="remove-account"
                        :aria-label="`移除账号 ${account.account}`"
                        :disabled="isLoading"
                        @click="removeAccount(account.userId)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p v-else class="recent-empty">暂无历史账号，登录后会显示在这里</p>
                </section>
              </el-popover>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password" label="密码">
          <el-input
            autocomplete="current-password"
            placeholder="请输入密码"
            type="password"
            v-model="loginForm.password"
            spellcheck="false"
            clearable
          >
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="验证码" prop="verifyCode" class="login-verify">
          <el-input
            placeholder="请输入验证码"
            v-model="loginForm.verifyCode"
            spellcheck="false"
            clearable
          />
          <button
            type="button"
            class="verify-refresh"
            aria-label="刷新验证码"
            @click="refreshVerifyCode"
          >
            <img :src="verifyCodeImg" alt="验证码" class="login-verifyImg" />
          </button>
        </el-form-item>
        <el-checkbox v-model="rememberLogin" :disabled="isLoading || !canRemember"
          >记住登录状态</el-checkbox
        >
        <p v-if="!canRemember" class="remember-hint">
          当前系统无法安全保存登录状态，仍可使用密码登录。
        </p>
        <div class="login-form-button">
          <el-button type="primary" @click="Login(ruleFormRef)" :loading="isLoading"
            >登录</el-button
          >
          <el-button @click="Register" :disabled="isLoading">注册账号</el-button>
        </div>
      </el-form>
    </div>
    <div class="login-bottom">欢迎回来，继续你的对话。</div>
  </div>
  <WindowControls
    :showSetTop="false"
    :showSetMiniSize="false"
    :showSetFullScreen="false"
    windowType="mainWindow"
  />
</template>

<script lang="ts" setup>
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import { User, Lock, ArrowDown } from '@element-plus/icons-vue'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, verifyCodeApi } from '@/api/User'
import WindowControls from '@/components/WindowControls.vue'
import { enterAccount } from '@/utils/enterAccount'
import type { RecentAccount } from '@/types/account'

onMounted(async () => {
  void refreshVerifyCode()
  try {
    const [accounts, capabilities] = await Promise.all([
      window.accountApi.listAccounts(),
      window.accountApi.capabilities()
    ])
    recentAccounts.value = accounts
    canRemember.value = capabilities.canRememberLogin
  } catch {
    ElMessage.warning('暂时无法加载历史账号')
  }
})

const router = useRouter()
const ruleFormRef = ref<FormInstance>()
const isLoading = ref(false)
const verifyCodeImg = ref('')
const recentAccounts = ref<RecentAccount[]>([])
const showRecentAccounts = ref(false)
const rememberLogin = ref(false)
const canRemember = ref(false)
onUnmounted(() => {
  if (verifyCodeImg.value) URL.revokeObjectURL(verifyCodeImg.value)
})

const refreshVerifyCode = async () => {
  try {
    // 关键：请求图片流必须指定 responseType: 'blob'
    const res = await verifyCodeApi({
      // 告诉 axios 接收二进制流
      responseType: 'blob'
    })
    // 把二进制流转成图片 URL
    if (verifyCodeImg.value) URL.revokeObjectURL(verifyCodeImg.value)
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
  if (!formEl || isLoading.value) return
  try {
    // 验证成功会进入这里，失败会直接跳去 catch
    await formEl.validate()
    isLoading.value = true
    const result = await loginApi({ ...loginForm, rememberLogin: rememberLogin.value })
    const status = result.code
    if (status === 1) {
      loginForm.password = ''
      await enterAccount(router)
    } else {
      ElMessage.error(result.msg)
      void refreshVerifyCode()
    }
  } catch (error) {
    ElMessage.error('登录失败')
  } finally {
    isLoading.value = false
  }
}

async function selectAccount(account: RecentAccount) {
  if (isLoading.value) return
  showRecentAccounts.value = false
  loginForm.account = account.account
  loginForm.password = ''
  loginForm.verifyCode = ''
  rememberLogin.value = account.rememberLogin && canRemember.value
  if (!account.canQuickLogin) return
  isLoading.value = true
  try {
    const result = await window.accountApi.quickLogin(account.userId)
    if (result.code === 1) await enterAccount(router)
    else {
      ElMessage.warning(result.msg || '请重新输入密码登录')
      recentAccounts.value = await window.accountApi.listAccounts()
      void refreshVerifyCode()
    }
  } catch {
    ElMessage.error('暂时无法登录，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

async function removeAccount(userId: string) {
  showRecentAccounts.value = false
  try {
    await ElMessageBox.confirm('移除本机的账号记录和登录凭据，聊天记录会保留。', '移除历史账号', {
      type: 'warning'
    })
    await window.accountApi.removeAccount(userId)
    recentAccounts.value = await window.accountApi.listAccounts()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error('移除账号失败，请稍后重试')
  }
}

const Register = () => {
  router.push('/register')
  ;(window as any).windowToolApi.resizeWindow('register')
}
</script>

<style scoped>
@import '@/css/account.css';
.login-verify :deep(.el-form-item__content) {
  flex-wrap: nowrap;
  gap: 10px;
}
.login-verify .el-input {
  flex: 1;
  min-width: 0;
}
.verify-refresh {
  display: grid;
  place-items: center;
  width: 96px;
  height: 42px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  cursor: var(--cursor-pointer, pointer);
}
.login-verifyImg {
  width: 96px;
  height: 40px;
  object-fit: contain;
}
.recent-title {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}
.recent-toggle {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.recent-toggle .el-icon {
  transition: transform 0.2s;
}
.recent-toggle .is-open {
  transform: rotate(180deg);
}
.recent-list {
  width: 280px;
  max-width: calc(100vw - 72px);
  max-height: 220px;
  overflow-y: auto;
}
.recent-empty {
  margin: 12px 0;
  color: var(--color-text-muted);
  font-size: 12px;
}
.recent-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.recent-account {
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  flex: 1;
  min-width: 0;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  cursor: pointer;
}
.recent-account:hover,
.recent-account:focus-visible {
  background: var(--color-surface-2);
}
.recent-account img,
.account-initial {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}
.account-initial {
  display: grid;
  place-items: center;
  background: var(--color-accent);
  color: var(--color-on-accent);
}
.recent-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.recent-info b,
.recent-info small {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.recent-info b {
  font-size: 13px;
  font-weight: 500;
}
.recent-info small,
.remember-hint {
  font-size: 11px;
  color: var(--color-text-muted);
}
.remove-account {
  background: transparent;
  color: var(--color-text-muted);
  padding: 10px;
  cursor: pointer;
}
.login-form-button {
  margin-top: 10px;
}
</style>
