<template>
  <div class="login-count">
    <div class="login-top">
      <h1 class="title">登录</h1>
    </div>
    <div class="login-mid">
      <el-form class="login-form" :model="loginForm" ref="ruleFormRef" :rules="rules">
        <el-form-item prop="username">
          <el-input placeholder="请输入账号" v-model="loginForm.account" clearable>
            <template #prepend>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input placeholder="请输入密码" type="password" v-model="loginForm.password" clearable>
            <template #prepend>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="verifyCode" class="login-verify">
          <el-input placeholder="请输入验证码" v-model="loginForm.verifyCode" clearable />
          <img
            :src="verifyCodeImg"
            alt="验证码"
            class="login-verifyImg"
            @click="refreshVerifyCode"
          />
        </el-form-item>
        <div class="login-form-button">
          <el-button type="primary" @click="Login(ruleFormRef)">登录</el-button>
          <el-button type="primary" @click="Register">注册</el-button>
        </div>
      </el-form>
    </div>
    <div class="login-bottom">
      <div class="login-bottom-reset">重置密码</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, verifyCodeApi } from '../../api/Login.js'
import { FormInstance, FormRules, ElMessage } from 'element-plus'

onMounted(() => {
  refreshVerifyCode()
})

const router = useRouter()
const ruleFormRef = ref<FormInstance>()

const verifyCodeImg = ref('')

const refreshVerifyCode = async () => {
  try {
    // 关键：请求图片流必须指定 responseType: 'blob'
    const res = await verifyCodeApi({
      // 告诉 axios 接收二进制流
      responseType: 'blob'
    })
    // 把二进制流转成图片 URL
    verifyCodeImg.value = URL.createObjectURL(res)
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
  account: [{ required: true, message: '账号不能为空', trigger: 'blur' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'blur' }],
  verifyCode: [{ required: true, message: '验证码不能为空', trigger: 'blur' }]
})

const Login = async (formEl: FormInstance | undefined) => {
  if (!formEl) return

  try {
    // 验证成功会进入这里，失败会直接跳去 catch
    await formEl.validate()
    const result = await loginApi(loginForm)
    const status = result.code
    console.log(status)
    if (status === 1) {
      // 存储令牌信息，由于token存储到了本地store，这里可以不需要了
      // localStorage.setItem('token', result.data.token)
      window.api.storeSetToken(result.data.token)
      window.api.storeSetAvatar(result.data.avatar)
      await router.push('/main')
      window.api.resizeWindow('main')
    } else {
      ElMessage.error('登录失败')
    }
  } catch (error) {
    console.log('error submit!')
    ElMessage.error('登录失败')
  }
}

const Register = () => {
  console.log('注册')
  router.push('/register')
  window.api.resizeWindow('register')
}
</script>

<style scoped>
.login-count {
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

.login-form {
  margin-top: 30px;
}

.title {
  text-align: center;
}

.login-mid {
  -webkit-app-region: no-drag;
}

.el-input {
  height: 40px;
}

.login-verify {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
}

.login-verify .el-input {
  /* 让输入框占据剩余空间 */
  flex: 1;
  /* 增加输入框和图片之间的间距 */
  margin-right: 10px;
}

.login-verifyImg {
  width: auto;
  height: 40px;
}

.login-form-button {
  display: flex;
  justify-content: space-around;
}

.login-form-button button {
  width: 50%;
}

.login-bottom-reset {
  text-align: center;
  margin-top: 20px;
  -webkit-app-region: no-drag;
}
</style>
