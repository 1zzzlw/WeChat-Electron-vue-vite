<template>
  <div class="registerUserInfo-count">
    <div class="registerUserInfo-mid">
      <el-form
        class="registerUserInfo-form"
        :model="registerUserInfoForm"
        :rules="rules"
        ref="ruleFormRef"
      >
        <el-form-item prop="password">
          <el-input placeholder="创建密码" v-model="registerUserInfoForm.password" clearable>
            <template #prepend>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            placeholder="确认密码"
            type="password"
            v-model="confirmPassword"
            clearable
          >
            <template #prepend>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="sex">
          <el-select
            placeholder="性别"
            v-model="registerUserInfoForm.gender"
            size="large"
            placement="top"
            clearable
          >
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
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, FormInstance } from 'element-plus'

const router = useRouter()
const route = useRoute()
const ruleFormRef = ref<FormInstance>()
const confirmPassword = ref()

onMounted(() => {
  registerUserInfoForm.username = route.query?.username || ''
  registerUserInfoForm.phone = route.query?.phone || ''
})

const registerUserInfoForm = reactive({
  username: '',
  phone: '',
  password: '',
  gender: ''
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

const nextStep = async (formRef: FormInstance | undefined) => {
  if (!formRef) return
  if (confirmPassword.value !== registerUserInfoForm.password) {
    ElMessage.error("确认密码输入错误")
    return
  }
  try {
    await formRef.validate()
    console.log(registerUserInfoForm)
    await router.push({ path: '/uploadAvatar', query: { ...registerUserInfoForm } })
  } catch (error: any) {
    ElMessage.error('表单校验失败')
  }
}
</script>

<style scoped>
.registerUserInfo-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #2b3e49;
  padding: 20px;
  -webkit-app-region: drag;
}

.registerUserInfo-mid {
  /* 不可拖动，保证能够点击 */
  -webkit-app-region: no-drag;
}

.registerUserInfo-form {
  margin-top: 30px;
}

.el-input {
  height: 40px;
}

.registerUserInfo-form-button {
  display: flex;
  justify-content: space-around;
}

.registerUserInfo-form-button button {
  width: 50%;
}
</style>
