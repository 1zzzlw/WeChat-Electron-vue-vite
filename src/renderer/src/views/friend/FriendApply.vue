<template>
  <div class="apply-count">
    <div class="apply-info">
      <div class="info-top">
        <img :src="applyInfo?.avatar" alt="" class="img" />
        <h1>{{ applyInfo?.username }}</h1>
      </div>
      <div class="info-mid">
        <div class="title">好友留言</div>
        <p>{{ applyInfo?.applyMsg }}</p>
      </div>
      <div class="info-bottom">
        <div class="btn-group" v-if="applyInfo?.isDealt == 0">
          <el-button type="success" @click="agreeButton">同意</el-button>
          <el-button type="danger" @click="refuseButton">拒绝</el-button>
        </div>
        <div class="btn-group" v-else-if="applyInfo?.isDealt == 1">
          <el-button type="success" disabled v-if="applyInfo.dealResult == 1">已同意</el-button>
          <el-button type="danger" disabled v-else-if="applyInfo.dealResult == 0">已拒绝</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { userApplyListInfo } from '../../stores/modules/UserApplyListStore'
import { friendInfo } from '../../stores/modules/ContactListStore'
import { conversationInfo } from '../../stores/modules/ConversationStore'
import { dealApplyApi } from '../../api/Apply'
import { ElMessage } from 'element-plus'
import { addConversation, addFriendRelation } from '../../db/dualDB'

const route = useRoute()
const userApplyStore = userApplyListInfo()
const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()
const username = ref()
const account = ref()
const phone = ref()
const avatar = ref()
const userId = ref()
const gender = ref()

const agreeButton = () => {
  dealApplyApi(applyInfo.value?.applyId, 1, applyInfo.value?.fromUserId).then(async (res: any) => {
    if (res.code === 1) {
      ElMessage.success('同意成功')
      if (applyInfo.value) {
        applyInfo.value.isDealt = 1
        applyInfo.value.dealResult = 0
      }
      userApplyStore.updateUserApplyMap(applyInfo.value?.applyId as string, {
        isDealt: 1,
        dealResult: 1
      })
      const firendPack = {
        userId: userId.value,
        friendId: applyInfo.value?.fromUserId,
        username: applyInfo.value?.username,
        avatar: applyInfo.value?.avatar,
        account: applyInfo.value?.account,
        gender: applyInfo.value?.gender,
        phone: applyInfo.value?.phone,
        email: applyInfo.value?.email,
        birthday: applyInfo.value?.birthday,
        address: applyInfo.value?.address,
        remark: '',
        relationStatus: 1
      }
      const conversationPack = {
        id: res.data,
        userId: userId.value,
        targetId: String(applyInfo.value?.fromUserId),
        name: applyInfo.value?.username,
        avatar: applyInfo.value?.avatar,
        remark: '',
        type: 0
      }
      // 加入好友关系缓存
      friendInfoStore.setFriendMap(applyInfo.value?.fromUserId as string, firendPack)
      // 将好友关系加入本地数据库
      addFriendRelation(firendPack)
      // 将会话关系加入本地数据库
      addConversation(conversationPack)
      // 将会话关系加入缓存
      conversationStore.setConversationMap(conversationPack.id, conversationPack)

      // 通知好友添加成功
      const wsFriendPack = {
        userId: userId.value,
        friendId: applyInfo.value?.fromUserId,
        username: username.value,
        account: account.value,
        gender: gender.value,
        phone: phone.value,
        avatar: avatar.value,
        dealResult: 1
      };
      (window as any).wsApi.sendMessage(14, 0, wsFriendPack)
    } else {
      ElMessage.error('同意失败')
    }
  })

}

const refuseButton = () => {
  dealApplyApi(applyInfo.value?.applyId, 0, applyInfo.value?.fromUserId).then((res: any) => {
    if (res.code === 1) {
      ElMessage.success('拒绝成功')
      if (applyInfo.value) {
        applyInfo.value.isDealt = 1
        applyInfo.value.dealResult = 0
      }
      userApplyStore.updateUserApplyMap(applyInfo.value?.applyId as string, {
        isDealt: 1,
        dealResult: 0
      })
    } else {
      ElMessage.error('拒绝失败')
    }
  })
}

onMounted(async () => {
  username.value = await (window as any).userInfoApi.storeGetUserInfo('username')
  account.value = await (window as any).userInfoApi.storeGetUserInfo('account')
  phone.value = await (window as any).userInfoApi.storeGetUserInfo('phone')
  avatar.value = await (window as any).userInfoApi.storeGetUserInfo('avatar')
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')
  gender.value = await (window as any).userInfoApi.storeGetUserInfo('gender')
})

const applyInfo = computed(() => userApplyStore.getUserApplyMap(route.query.applyId as string))
</script>

<style scoped>
.apply-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.apply-info {
  width: 660px;
  height: 580px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  background: rgba(70, 100, 130, 0.2);
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  -webkit-app-region: no-drag;
}

.apply-info:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}

.info-top {
  width: 100%;
  height: 150px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 40px;
  gap: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

.img {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.img:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.25);
}

h1 {
  color: rgba(255, 255, 255, 0.9);
  font-size: 28px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.info-mid {
  width: 100%;
  height: 200px;
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

.title {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 20px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
  padding: 10px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.info-mid p {
  color: rgba(255, 255, 255, 0.85);
  font-size: 16px;
  padding: 0 40px;
  line-height: 1.6;
}

.info-bottom {
  width: 100%;
  height: 230px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
}

.btn-group {
  width: 400px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.el-button {
  width: 50%;
  transition: all 0.2s ease;
  border-radius: 8px;
  font-weight: 600;
  height: 50px;
  font-size: 16px;
}

.el-button--success {
  background-color: rgba(80, 150, 220, 0.8);
  border-color: rgba(80, 150, 220, 0.8);
  color: #fff;
  border-radius: 8px;
  transition: all 0.2s ease;
  --el-button-disabled-bg-color: rgba(80, 150, 220, 0.4);
  --el-button-disabled-border-color: rgba(80, 150, 220, 0.4);
  --el-button-disabled-text-color: rgba(255, 255, 255, 0.7);
}

.el-button--success.is-disabled {
  background-color: rgba(80, 150, 220, 0.4);
  border-color: rgba(80, 150, 220, 0.5);
  color: rgba(255, 255, 255, 0.7);
  cursor: not-allowed;
  transform: none;
}

.el-button--success:hover {
  background-color: rgba(80, 150, 220, 1);
  border-color: rgba(80, 150, 220, 1);
  transform: scale(1.03);
}

.el-button--danger {
  background-color: rgba(70, 90, 120, 0.8);
  border-color: rgba(70, 90, 120, 0.8);
  color: #fff;
  border-radius: 8px;
  transition: all 0.2s ease;
  --el-button-disabled-bg-color: rgba(70, 90, 120, 0.4);
  --el-button-disabled-border-color: rgba(70, 90, 120, 0.4);
  --el-button-disabled-text-color: rgba(255, 255, 255, 0.7);
}

.el-button--danger.is-disabled {
  background-color: rgba(70, 90, 120, 0.4);
  border-color: rgba(70, 90, 120, 0.5);
  color: rgba(255, 255, 255, 0.7);
  cursor: not-allowed;
  transform: none;
}

.el-button--danger:hover {
  background-color: rgba(245, 108, 108, 1);
  border-color: rgba(245, 108, 108, 1);
  transform: scale(1.03);
}

.el-button.is-disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
