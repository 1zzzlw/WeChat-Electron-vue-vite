<template>
  <div class="registerUserInfo-count">
    <div class="auth-brand"><b>im</b><span>LUMINA / CONNECT</span></div>
    <div class="register-top">
      <h1 class="title">完善你的信息</h1>
      <p class="auth-subtitle">02 / 设置密码，保护每一段对话。</p>
    </div>
    <div class="registerUserInfo-mid">
      <el-form label-position="top" class="registerUserInfo-form" :model="registerUserInfoForm" :rules="rules" ref="ruleFormRef"
        @keyup.enter="handleEnterRegisterUserInfo">
        <el-form-item prop="password" label="密码">
          <el-input type="password" autocomplete="new-password" placeholder="创建密码" v-model="registerUserInfoForm.password" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="confirmPassword" label="确认密码">
          <el-input autocomplete="new-password" placeholder="确认密码" type="password" v-model="confirmPassword" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="gender" label="性别">
          <el-select placeholder="性别" v-model="registerUserInfoForm.gender" size="large" placement="top" clearable
            class="gender-select" popper-class="register-select-popper">
            <el-option label="男" value="1" />
            <el-option label="女" value="0" />
          </el-select>
        </el-form-item>

        <div class="registerUserInfo-form-button">
          <el-button @click="returnStep">上一步</el-button>
          <el-button type="primary" @click="nextStep(ruleFormRef)">下一步</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElMessage, FormInstance } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRegisterInfoStore } from '@/stores/modules/RegisterInfoStore'

const registerInfoStore = useRegisterInfoStore()
const router = useRouter()
const route = useRoute()
const ruleFormRef = ref<FormInstance>()
const confirmPassword = ref()

const registerUserInfoForm = reactive({
  username: '',
  phone: '',
  password: '',
  gender: ''
})

onMounted(() => {
  const registerTwoInfo = registerInfoStore.getRegisterTwoInfo()
  registerUserInfoForm.password = registerTwoInfo.password || ''
  registerUserInfoForm.gender = registerTwoInfo.gender || ''

  registerUserInfoForm.username = route.query?.username as string || '';
  registerUserInfoForm.phone = route.query?.phone as string || '';
})

const rules = reactive({
  // 密码：必填 + 长度校验
  password: [
    { required: true, message: '密码不能为空', trigger: 'submit' },
    {
      min: 6,
      max: 16,
      message: '密码长度需在6-16位之间',
      trigger: 'submit'
    }
  ]
})

const returnStep = () => {
  router.push('/register')
}

// 回车触发下一步
const handleEnterRegisterUserInfo = () => {
  nextStep(ruleFormRef.value)
}

const nextStep = async (formRef: FormInstance | undefined) => {
  if (!formRef) return
  if (confirmPassword.value !== registerUserInfoForm.password) {
    ElMessage.error('确认密码输入错误')
    return
  }
  try {
    await formRef.validate()
    registerInfoStore.setRegisterInfo({
      userName: registerUserInfoForm.username,
      phoneNumber: registerUserInfoForm.phone,
      password: registerUserInfoForm.password,
      gender: registerUserInfoForm.gender
    })
    await router.push({ path: '/uploadAvatar', query: { ...registerUserInfoForm } })
  } catch (error: any) {
    ElMessage.error('表单校验失败')
  }
}
</script>

<style scoped>
@import '@/css/account.css';
.gender-select { width: 100%; }
</style>
