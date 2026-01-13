<template>
  <div class="register-count">
    <span></span>
    <div class="register-top">
      <h1 class="title">注册</h1>
    </div>
    <div class="register-mid">
      <el-form @keyup.enter="handleEnterRegister" class="register-form" :model="registerForm" ref="ruleFormRef"
        :rules="rules">
        <el-form-item prop="username">
          <el-input placeholder="输入用户名" v-model="registerForm.username" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="phone">
          <el-input placeholder="输入手机号" v-model="registerForm.phone" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Phone />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="email">
          <el-input placeholder="输入验证码" v-model="registerForm.phoneCode" spellcheck="false" clearable>
            <template #append>
              <el-button type="primary" @click="getCode(ruleFormRef, 'phone')" :disabled="isCounting">{{ isCounting ?
                `${count}秒后重新获取` : '获取验证码' }}</el-button>
            </template>
          </el-input>
        </el-form-item>

        <div class="register-form-button">
          <el-button type="primary" @click="returnLogin">返回</el-button>
          <el-button type="primary" @click="nextStep(ruleFormRef, 'username')">下一步</el-button>
        </div>
      </el-form>
    </div>
    <div class="register-bottom">
      <router-link to="/?">协议</router-link>
    </div>
  </div>
  <WindowControls :showSetTop="false" :showSetMiniSize="false" :showSetFullScreen="false" />
</template>

<script lang="ts" setup>
import { ref, reactive, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendPhoneCodeApi } from '../../api/Register'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import WindowControls from '../../components/WindowControls.vue'
import { useRegisterInfoStore } from '../../stores/RegisterInfoStore'

const registerInfoStore = useRegisterInfoStore()
const router = useRouter()
const isCounting = ref(false)
const count = ref(60)
const correctCode = ref('')
const ruleFormRef = ref<FormInstance>()
let timer: any = null

const rules = reactive<FormRules>({
  // 用户名校验
  username: [
    { required: true, message: '用户名不能为空', trigger: 'submit' },
    { min: 2, max: 10, message: '用户名长度需在2-10位之间', trigger: 'blur' },
    {
      pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/,
      message: '用户名仅支持中英文、数字和下划线',
      trigger: 'blur'
    }
  ],
  phone: [
    { required: true, message: '手机号不能为空', trigger: 'submit' },
    {
      pattern: /^1([38][0-9]|4[579]|5[0-3,5-9]|6[6]|7[0135678]|9[89])\d{8}$/,
      message: '请输入正确的手机号',
      trigger: 'submit'
    }
  ]
})

const registerForm = reactive({
  username: '',
  phone: '',
  phoneCode: ''
})

const getCode = async (formEl: FormInstance | undefined, type: 'phone') => {
  // 先校验表单实例是否存在
  if (!formEl) return

  if (type === 'phone') {
    try {
      // 只校验手机号字段
      await formEl.validateField('phone')
      const res: any = await sendPhoneCodeApi(registerForm.phone)
      if (res.code === 1) {
        ElMessage.success('验证码发送成功')
        correctCode.value = res.data
        startCountdown()
      } else {
        ElMessage.error('验证码发送失败')
      }
    } catch (error: any) {
      ElMessage.error('获取验证码失败')
    }
  }
}

// 启动倒计时 60s
const startCountdown = () => {
  isCounting.value = true
  count.value = 60
  timer = setInterval(() => {
    count.value--
    // 倒计时结束
    if (count.value <= 0) {
      clearInterval(timer)
      isCounting.value = false
    }
  }, 1000)
}

const returnLogin = () => {
  console.info('返回登录页');
  (window as any).api.resizeWindow('login')
  router.push('/login')
}

// 回车触发下一步
const handleEnterRegister = () => {
  nextStep(ruleFormRef.value, 'username')
}

const nextStep = async (formEl: FormInstance | undefined, type: 'username') => {
  console.log('registerForm: ', registerForm)
  if (!formEl) return
  try {
    await formEl.validateField(type)
    if (correctCode.value !== registerForm.phoneCode) {
      ElMessage.error('验证码输入错误')
      return
    }
    if (!registerForm.phoneCode) {
      ElMessage.error('验证码不能为空')
      return
    }
    // 保存注册信息
    registerInfoStore.setRegisterInfo({
      userName: registerForm.username,
      phoneNumber: registerForm.phone
    })
    await router.push({
      path: '/registerUserInfo',
      query: { username: registerForm.username, phone: registerForm.phone }
    })
  } catch (error: any) {
    ElMessage.error('用户名校验失败')
    return
  }
}

onMounted(() => {
  const registerInfo = registerInfoStore.getRegisterOneInfo()
  console.log(registerInfo)
  registerForm.username = registerInfo.userName
  registerForm.phone = registerInfo.phoneNumber
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null // 彻底释放
  }
})
</script>

<style scoped>
@import '../../css/account.css';

:deep(.el-input-group__append) {
  /* 适配注册页的红粉色系，更柔和不刺眼 */
  background: rgba(237, 40, 100, 0.7);
  /* 玻璃边框+圆角，贴合整体风格 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  /* 去掉默认阴影，加细腻内发光 */
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.2);
  /* 文字样式优化 */
  color: #fff;
  font-size: 13px;
  /* 交互动效增强 */
  transition: all 0.2s ease;
}

/* hover效果：提亮+轻微放大 */
:deep(.el-input-group__append):hover {
  background: rgba(237, 40, 100, 0.85);
  transform: scale(1.02);
  box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.3);
}

/* 不可点击时的样式（比如倒计时中） */
:deep(.el-input-group__append):disabled {
  background: rgba(237, 40, 100, 0.4);
  cursor: not-allowed;
  transform: none;
}

.register-bottom {
  display: flex;
  justify-content: end;
  margin-top: 20px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-style: italic;
  text-align: center;
  color: #ffffff;
  text-decoration: underline;
  -webkit-app-region: no-drag;
}
</style>
