<template>
  <div class="registerUserInfo-count">
    <span></span>
    <div class="register-top">
      <h1 class="title">注册</h1>
    </div>
    <div class="registerUserInfo-mid">
      <el-form class="registerUserInfo-form" :model="registerUserInfoForm" :rules="rules" ref="ruleFormRef"
        @keyup.enter="handleEnterRegisterUserInfo">
        <el-form-item prop="password">
          <el-input placeholder="创建密码" v-model="registerUserInfoForm.password" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input placeholder="确认密码" type="password" v-model="confirmPassword" spellcheck="false" clearable>
            <template #prepend>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="sex">
          <el-select placeholder="性别" v-model="registerUserInfoForm.gender" size="large" placement="top" clearable
            class="gender-select" popper-class="register-select-popper">
            <el-option label="男" value="1" />
            <el-option label="女" value="0" />
          </el-select>
        </el-form-item>

        <div class="registerUserInfo-form-button">
          <el-button type="primary" @click="returnStep">返回</el-button>
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

:deep(.el-select__wrapper) {
  background: rgba(0, 0, 0, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-select__wrapper:hover) {
  background: rgba(0, 0, 0, 0.2) !important;
  border-color: rgba(255, 118, 224, 0.5) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  transform: translateY(-1px);
}

:deep(.el-select__wrapper.is-focus) {
  background: rgba(0, 0, 0, 0.25) !important;
  border-color: #ff76e0 !important;
  box-shadow: 0 0 12px rgba(255, 118, 224, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
}

:deep(.el-select__placeholder) {
  color: rgba(255, 255, 255, 0.7) !important;
}

:deep(.el-select__selected-item) {
  color: #ffffff !important;
}

:deep(.el-select__caret) {
  color: rgba(255, 255, 255, 0.6) !important;
}

.registerUserInfo-mid {
  height: 320px;
}
</style>

<style>
/* 全局样式覆盖 el-select 下拉框 popper */
.register-select-popper.el-popper {
  background: rgba(40, 20, 40, 0.8) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 118, 224, 0.3) !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
}

.register-select-popper .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.8) !important;
  background-color: transparent !important;
  transition: all 0.2s ease !important;
}

.register-select-popper .el-select-dropdown__item.hover,
.register-select-popper .el-select-dropdown__item:hover {
  background: rgba(255, 118, 224, 0.25) !important;
  color: #ff76e0 !important;
}

.register-select-popper .el-select-dropdown__item.selected {
  color: #ff76e0 !important;
  font-weight: 600 !important;
  background: rgba(255, 118, 224, 0.15) !important;
}

.register-select-popper .el-select-dropdown__item.selected.hover,
.register-select-popper .el-select-dropdown__item.selected:hover {
  background: rgba(255, 118, 224, 0.3) !important;
}

.register-select-popper .el-popper__arrow::before {
  background: rgba(40, 20, 40, 0.8) !important;
  border: 1px solid rgba(255, 118, 224, 0.3) !important;
}
</style>
