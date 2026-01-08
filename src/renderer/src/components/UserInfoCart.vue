<template>
  <div class="user-info-cart">
    <div class="cart-top">
      <img :src="avatarUrl" alt="头像" class="cart-top-img" />
      <div class="cart-top-mid">
        <div class="user-name">用户昵称</div>
        <div class="user-account">用户账号</div>
      </div>
      <div class="iconfont icon-dianzan"></div>
    </div>
    <div class="cart-bottom"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import '../assets/iconfont/iconfont.css'

const avatarUrl = ref('')

onMounted(async () => {
  avatarUrl.value = await window.userInfoApi.storeGetUserInfo('avatar')
})
</script>

<style scoped>
.user-info-cart {
  display: flex;
  align-items: center;
}

.cart-top {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: #8c939d solid 1px;
}

.cart-top-mid {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 10px;
  gap: 10px;
}

.cart-top-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-left: 20px;
}

.iconfont {
  width: 30px;
  font-size: 24px;
  margin-right: 20px;
}

.iconfont:hover {
  transform: scale(1.3);
  opacity: 0.9;
  transition: all 0.2s ease;
}
</style>
