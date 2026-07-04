<template>
  <div class="user-info-cart">
    <!-- 顶部信息区 -->
    <div class="cart-top">
      <!-- 头像区域 -->
      <div class="avatar-container">
        <img :src="avatarUrl" alt="用户头像" class="cart-top-img" />
        <!-- 在线状态标识 -->
        <div class="online-status"></div>
      </div>

      <!-- 用户名和账号等核心信息 -->
      <div class="cart-top-mid">
        <div class="user-name">{{ userName }}</div>
        <div class="user-account">{{ account }}</div>
        <!-- 性别展示 -->
        <div class="user-gender">
          <el-icon size="14">
            <Female v-if="gender === 0" color="#ff9ecc" />
            <Male v-else-if="gender === 1" color="#66b1ff" />
          </el-icon>
          <span>{{ gender === 0 ? '女' : gender === 1 ? '男' : '未知' }}</span>
        </div>
        <!-- 手机号展示 -->
        <div class="user-phone" v-if="phone">
          <el-icon size="14" class="phone-icon">
            <Iphone />
          </el-icon>
          <span>{{ phone }}</span>
        </div>
      </div>
    </div>

    <!-- 底部统计区 -->
    <div class="cart-bottom">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ friendCount }}</div>
          <div class="stat-label">好友</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ groupCount }}</div>
          <div class="stat-label">群聊</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ noteCount }}</div>
          <div class="stat-label">笔记</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Male, Female, Iphone } from '@element-plus/icons-vue'
import { friendInfo } from '@/stores/modules/ContactListStore'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import '@/assets/iconfont/iconfont.css'
import { getNodeCount } from '@/db/dualDB'

const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()

const avatarUrl = ref('')        // 头像地址
const userName = ref('')         // 用户名
const account = ref('')          // 用户账号
const phone = ref('')            // 手机号
const gender = ref(-1)           // 性别 1-男 0-女 -1-未知
const noteCount = ref(0)         // 笔记数量

// 加载用户信息
const loadUserInfo = async () => {
  avatarUrl.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
  userName.value = await (window as any).userInfoApi.storeGetUserInfo('username')
  account.value = await (window as any).userInfoApi.storeGetUserInfo('account')
  phone.value = await (window as any).userInfoApi.storeGetUserInfo('phone')
  gender.value = await (window as any).userInfoApi.storeGetUserInfo('gender')
}

const friendCount = computed(() => friendInfoStore.getFriendCount())
const groupCount = computed(() => conversationStore.getGroupConversationCount())

const loadCountInfo = async () => {
  // 从本地数据库获得笔记数量
  noteCount.value = await getNodeCount()
}

// 组件挂载时加载数据
onMounted(() => {
  loadUserInfo()
  loadCountInfo()
})
</script>

<style scoped>
.user-info-cart {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(25, 30, 40, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  color: #f5f5f5;
}

.cart-top {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
  /* 轻量化分割线 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.avatar-container {
  position: relative;
}

.cart-top-img {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  object-fit: cover;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.1);
  transition: box-shadow 0.2s ease;
}

.cart-top-img:hover {
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
}

.online-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4cd964;
  border: 2px solid rgba(25, 30, 40, 0.7);
  box-shadow: 0 0 4px rgba(76, 217, 100, 0.4);
}

.cart-top-mid {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 16px;
  gap: 3px;
}

.user-name {
  font-size: 17px;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.2;
}

.user-account {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.2;
}

.user-gender {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-phone {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  gap: 4px;
}

.phone-icon {
  color: rgba(102, 177, 255, 0.7);
}

.cart-bottom {
  height: calc(100% - 100px);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.stat-item {
  text-align: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  transition: background 0.2s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.stat-value {
  font-size: 18px;
  font-weight: 500;
  color: #66b1ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
</style>