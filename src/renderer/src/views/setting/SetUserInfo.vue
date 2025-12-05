<template>
  <div class="setting-user-info">
    <div class="setting-left">
      <div class="setting-info">
        <div class="setting-button">
          <router-link to="/account">
            <div class="setting-button-item">
              <span class="iconfont icon-yonghu"> 账号 </span>
            </div>
          </router-link>
          <router-link to="/storeLocation">
            <div class="setting-button-item">
              <span class="iconfont icon-cunchujuan"> 存储 </span>
            </div>
          </router-link>
          <router-link to="/shortcutKey">
            <div class="setting-button-item">
              <span class="iconfont icon-kuaijiejian"> 快捷键 </span>
            </div>
          </router-link>
          <router-link to="/informSet">
            <div class="setting-button-item">
              <span class="iconfont icon-tongzhi"> 通知 </span>
            </div>
          </router-link>
          <router-link to="/about">
            <div class="setting-button-item">
              <span class="iconfont icon-guanyu"> 关于 </span>
            </div>
          </router-link>
        </div>
      </div>
    </div>
    <div class="setting-right">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import '../../assets/iconfont/iconfont.css'
</script>

<style scoped>
.setting-user-info {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: skyblue;
  border-radius: 10px;
}

.setting-left {
  width: 200px;
  height: 100%;
  border-right: black 1px solid;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.setting-button {
  width: 100%;
  height: 450px;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  overflow: hidden;
  background-color: #8c939d;
  padding-left: 10px;
}

.setting-button-item {
  width: 100%;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s ease;
}

.setting-button-item:hover {
  background-color: #f5f7fa;
}

.setting-right {
  flex: 1;
  background-color: aqua;
  -webkit-app-region: drag;
}
</style>
