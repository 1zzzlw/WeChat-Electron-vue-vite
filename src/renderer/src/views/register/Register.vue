<template>
  <div class="register-count">
    <div class="register-mid">
      <el-form class="register-form" :model="registerForm" ref="ruleFormRef" :rules="rules">
        <el-form-item prop="username">
          <el-input placeholder="输入用户名" v-model="registerForm.username" clearable>
            <template #prepend>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="phone">
          <el-input placeholder="输入手机号" v-model="registerForm.phone" clearable>
            <template #prepend>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="email">
          <el-input placeholder="输入验证码" v-model="registerForm.phoneCode" clearable>
            <template #append>
              <el-button
                type="primary"
                @click="getCode(ruleFormRef, 'phone')"
                :disabled="isCounting"
                >{{ isCounting ? `${count}秒后重新获取` : '获取验证码' }}</el-button
              >
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
      <a href="">协议</a>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendPhoneCodeApi } from '../../api/Register'
import { ElMessage, FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const isCounting = ref(false)
const count = ref(60)
const correctCode = ref('')
const ruleFormRef = ref<FormInstance>()
let timer = null

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
      const res = await sendPhoneCodeApi(registerForm.phone)
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
  router.push('/login')
}

const nextStep = async (formEl: FormInstance | undefined, type: 'username') => {
  console.log("registerForm: ", registerForm)
  await router.push({
    path: '/registerUserInfo',
    query: { username: registerForm.username, phone: registerForm.phone }
  })
  // if (!formEl) return
  // try {
  //   await formEl.validateField(type)
  //   if (correctCode.value !== registerForm.phoneCode) {
  //     ElMessage.error('验证码输入错误')
  //     return
  //   }
  //   if (!registerForm.phoneCode) {
  //     ElMessage.error('验证码不能为空')
  //     return
  //   }
  //   await router.push({
  //     path: '/registerUserInfo',
  //     query: { username: registerForm.username, phone: registerForm.phone }
  //   })
  // } catch (error: any) {
  //   ElMessage.error('用户名校验失败')
  //   return
  // }
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null // 彻底释放
  }
})
</script>

<style scoped>
.register-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #2b3e49;
  padding: 20px;
  -webkit-app-region: drag;
}

.register-mid {
  /* 不可拖动，保证能够点击 */
  -webkit-app-region: no-drag;
}

.register-form {
  margin-top: 30px;
}

.el-input {
  height: 40px;
}

.register-form-button {
  display: flex;
  justify-content: space-around;
}

.register-form-button button {
  width: 50%;
}

.register-bottom {
  /* 不可拖动，保证能够点击 */
  -webkit-app-region: no-drag;
}
</style>
