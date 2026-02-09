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
    <WindowControls windowType="setting" />
  </div>
</template>

<script setup lang="ts">
import '../../assets/iconfont/iconfont.css'
import WindowControls from '../../components/WindowControls.vue'
</script>

<style scoped>
.setting-user-info {
  display: flex;
  width: 100%;
  height: 100%;
}

.setting-left {
  width: 200px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  -webkit-app-region: drag;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  padding: 20px 0;
  overflow: hidden;
}

.setting-info {
  width: 100%;
  height: 450px;
  position: relative;
}

.setting-button {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  overflow: hidden;
  padding-left: 10px;
  -webkit-app-region: no-drag;
}

.setting-button-item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  color: #f5f5f5;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.setting-button-item .iconfont {
  margin-right: 10px;
  font-size: 16px;
}

.setting-button-item:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  border-left: 2px solid rgba(255, 255, 255, 0.8);
}

.setting-right {
  flex: 1;
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  -webkit-app-region: drag;
}
</style>
