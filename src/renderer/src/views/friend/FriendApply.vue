<template>
  <main class="contact-detail-page apply-count">
    <article v-if="applyInfo" class="contact-detail-card apply-info">
      <header class="detail-identity">
        <el-avatar :size="72" :src="applyInfo.avatar">{{
          applyInfo.username?.slice(0, 1)
        }}</el-avatar>
        <div class="detail-heading">
          <p class="detail-eyebrow">FRIEND REQUEST · 好友申请</p>
          <h1>{{ applyInfo.username }}</h1>
          <p class="detail-id">账号 · {{ applyInfo.account || '未填写' }}</p>
        </div>
        <span class="detail-status">{{
          applyInfo.isDealt === 0 ? '等待处理' : applyInfo.dealResult === 1 ? '已同意' : '已拒绝'
        }}</span>
      </header>
      <section class="detail-section">
        <h2>验证消息</h2>
        <blockquote class="detail-message">
          {{ applyInfo.applyMsg || '对方希望与你成为好友。' }}
        </blockquote>
      </section>
      <section class="detail-section">
        <h2>申请人资料</h2>
        <dl class="detail-grid">
          <div>
            <dt>性别</dt>
            <dd>{{ applyInfo.gender === 1 ? '男' : applyInfo.gender === 0 ? '女' : '未填写' }}</dd>
          </div>
          <div>
            <dt>地区</dt>
            <dd>{{ applyInfo.address || '未填写' }}</dd>
          </div>
        </dl>
      </section>
      <footer class="detail-actions">
        <template v-if="applyInfo.isDealt === 0"
          ><el-button :disabled="processing" @click="refuseButton">拒绝申请</el-button
          ><el-button type="primary" :loading="processing" @click="agreeButton"
            >同意添加</el-button
          ></template
        >
        <p v-else>
          {{
            applyInfo.dealResult === 1
              ? '你们已经是好友，去开启新的对话吧。'
              : '这条好友申请已处理。'
          }}
        </p>
      </footer>
    </article>
    <div v-else class="detail-empty">请选择左侧的好友申请。</div>
  </main>
</template>
<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import '@/css/contactDetail.css'
import { useRoute } from 'vue-router'
import { userApplyListInfo } from '@/stores/modules/UserApplyListStore'
import { friendInfo } from '@/stores/modules/ContactListStore'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { dealApplyApi } from '@/api/Apply'
import { ElMessage } from 'element-plus'
import { addConversation, addFriendRelation } from '@/db/dualDB'
import { messageInfo } from '@/stores/modules/MessageStore'
import { Message } from '@/types/message'
import { createSystemMessagePack, createContentJson } from '@/utils/systemMessageUtil'
import { SystemMsgSubType, getSystemMsgText } from '@/utils/constants'

const route = useRoute()
const userApplyStore = userApplyListInfo()
const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()
const messageStore = messageInfo()
const username = ref()
const account = ref()
const phone = ref()
const avatar = ref()
const userId = ref()
const gender = ref()

const processing = ref(false)
const agreeButton = async () => {
  if (processing.value || !applyInfo.value || applyInfo.value.isDealt !== 0) return
  const application = applyInfo.value
  processing.value = true
  try {
    const res: any = await dealApplyApi(application.applyId, 1, application.fromUserId)
    if (res.code === 1) {
      ElMessage.success('同意成功')
      if (application) {
        application.isDealt = 1
        application.dealResult = 1
      }
      userApplyStore.updateUserApplyMap(application.applyId as string, {
        isDealt: 1,
        dealResult: 1
      })
      const isOnline = res.data.isOnline === 1 ? true : false
      const firendPack = {
        userId: userId.value,
        friendId: application.fromUserId,
        username: application.username,
        avatar: application.avatar,
        account: application.account,
        gender: application.gender,
        phone: application.phone,
        email: application.email,
        birthday: application.birthday,
        address: application.address,
        remark: '',
        relationStatus: 1,
        isOnline: isOnline
      }
      const conversationPack = {
        id: res.data.conversationId,
        userId: userId.value,
        targetId: String(application.fromUserId),
        name: application.username,
        avatar: application.avatar,
        remark: '',
        type: 0
      }
      // 加入好友关系缓存
      friendInfoStore.setFriendMap(application.fromUserId as string, firendPack)
      // 将好友关系加入本地数据库
      addFriendRelation(firendPack)
      // 将会话关系加入本地数据库
      addConversation(conversationPack)
      // 将会话关系加入缓存
      conversationStore.setConversationMap(conversationPack.id, conversationPack)

      // 通知好友添加成功
      const wsFriendPack = {
        userId: userId.value,
        friendId: application.fromUserId,
        username: username.value,
        account: account.value,
        gender: gender.value,
        phone: phone.value,
        avatar: avatar.value,
        dealResult: 1
      }
      ;(window as any).wsApi.sendMessage(14, 0, wsFriendPack)

      // 发送系统消息包
      const tpl = getSystemMsgText(SystemMsgSubType.FRIEND_ADDED, { name: username.value })
      const content = createContentJson(
        tpl,
        username.value,
        application.fromUserId,
        application.username,
        application.avatar
      )

      const receiverIds = [application.fromUserId]

      const systemMessagePack = await createSystemMessagePack(
        application.fromUserId,
        conversationPack.id,
        SystemMsgSubType.FRIEND_ADDED,
        content,
        receiverIds
      )

      messageStore.sendSystemMessage(
        systemMessagePack as Message,
        conversationPack.id,
        receiverIds as string[]
      )
    } else {
      ElMessage.error('同意失败')
    }
  } catch {
    ElMessage.error('处理好友申请失败，请重试')
  } finally {
    processing.value = false
  }
}

const refuseButton = async () => {
  if (processing.value || !applyInfo.value || applyInfo.value.isDealt !== 0) return
  const application = applyInfo.value
  processing.value = true
  try {
    const res: any = await dealApplyApi(application.applyId, 0, application.fromUserId)
    if (res.code !== 1) throw new Error(res.msg || '处理失败')
    userApplyStore.updateUserApplyMap(application.applyId, { isDealt: 1, dealResult: 0 })
    ElMessage.success('已拒绝好友申请')
  } catch {
    ElMessage.error('处理好友申请失败，请重试')
  } finally {
    processing.value = false
  }
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
