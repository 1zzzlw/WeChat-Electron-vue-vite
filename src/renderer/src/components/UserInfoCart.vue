<template>
  <div class="user-info-cart">
    <div class="cart-top">
      <img :src="avatarUrl" alt="头像" class="cart-top-img" />
      <div class="cart-top-mid">
        <div class="user-name">{{ userName }}</div>
        <div class="user-account">{{ userAccount }}</div>
      </div>
      <div class="iconfont icon-dianzan" @click="handleLike"></div>
    </div>
    <div class="cart-bottom">
      <!-- 底部内容区域 -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import '../assets/iconfont/iconfont.css'

// 用户信息
const avatarUrl = ref('')
const userName = ref('')
const userAccount = ref('')

// 点赞处理
const handleLike = () => {
  console.log('点赞')
  // TODO: 实现点赞逻辑
}

// 加载用户信息
const loadUserInfo = async () => {
  avatarUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
  userName.value = await window.userInfoApi.storeGetUserInfo('username')
  userAccount.value = await window.userInfoApi.storeGetUserInfo('account')
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.user-info-cart {
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.cart-top {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: #e4e7ed solid 1px;
  padding: 0 20px;
  box-sizing: border-box;
}

.cart-top-mid {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 15px;
  gap: 8px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.user-account {
  font-size: 13px;
  color: #909399;
  line-height: 1.2;
}

.cart-top-img {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e4e7ed;
}

.iconfont {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #909399;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.iconfont:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  transform: scale(1.1);
}

.iconfont:active {
  transform: scale(0.95);
}

.cart-bottom {
  min-height: 100px;
  padding: 15px 20px;
}
</style>