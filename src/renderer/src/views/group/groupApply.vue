<template>
  <main class="contact-detail-page groupApply-count">
    <article v-if="groupApplyInfo" class="contact-detail-card groupApply-info">
      <header class="detail-identity">
        <el-avatar :size="72" :src="groupApplyInfo.userAvatar">群</el-avatar>
        <div class="detail-heading">
          <p class="detail-eyebrow">GROUP INVITATION · 群聊申请</p>
          <h1>{{ groupApplyInfo.groupName || '群聊邀请' }}</h1>
          <p class="detail-id">邀请你加入这段群体对话</p>
        </div>
        <span class="detail-status">{{
          groupApplyInfo.status === 1
            ? '等待处理'
            : groupApplyInfo.status === 2
              ? '已加入'
              : '已拒绝'
        }}</span>
      </header>
      <section class="detail-section">
        <h2>邀请信息</h2>
        <dl class="detail-grid">
          <div>
            <dt>群号</dt>
            <dd>{{ groupApplyInfo.conversationId }}</dd>
          </div>
          <div>
            <dt>邀请人 ID</dt>
            <dd>{{ groupApplyInfo.userId }}</dd>
          </div>
        </dl>
      </section>
      <section class="detail-section">
        <h2>一起开启对话</h2>
        <p class="detail-message">加入后，你可以与群成员交流并接收群聊消息。</p>
      </section>
      <footer class="detail-actions">
        <template v-if="groupApplyInfo.status === 1"
          ><el-button :disabled="isLoading" @click="refuseButton">拒绝邀请</el-button
          ><el-button type="primary" :loading="isLoading" @click="agreeButton"
            >接受并加入</el-button
          ></template
        >
        <p v-else>
          {{ groupApplyInfo.status === 2 ? '你已加入这个群聊。' : '这条群聊邀请已处理。' }}
        </p>
      </footer>
    </article>
    <div v-else class="detail-empty">请选择左侧的群聊申请。</div>
  </main>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import '@/css/contactDetail.css'
import { useRoute } from 'vue-router'
import { userApplyListInfo } from '@/stores/modules/UserApplyListStore'
import { ElMessage } from 'element-plus'
import { getGroupMemberListApi } from '@/api/Conversation'
import { groupMemberInfo } from '@/stores/modules/GroupMemberStore'
import { addConversation } from '@/db/dualDB'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { dealGroupApplyApi } from '@/api/Apply'
import { getSystemMsgText, SystemMsgSubType } from '@/utils/constants'
import { createContentJson, createSystemMessagePack } from '@/utils/systemMessageUtil'
import { messageInfo } from '@/stores/modules/MessageStore'
import { Message } from '@/types/message'

const route = useRoute()
const UserApplyListStore = userApplyListInfo()
const userApplyStore = userApplyListInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()
const isLoading = ref(false)
const messageStore = messageInfo()

// 同意申请
const agreeButton = async () => {
  if (isLoading.value || !groupApplyInfo.value || groupApplyInfo.value.status !== 1) return
  const application = groupApplyInfo.value
  isLoading.value = true
  try {
    const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
    const username = await (window as any).userInfoApi.storeGetUserInfo('username')
    const avatar = await (window as any).userInfoApi.storeGetUserInfo('avatar')

    // 获取群成员信息列表
    const groupMemberList: any = await getGroupMemberListApi(application.conversationId)

    const avatarUrlList = groupMemberList.data.map((userInfo: any) => userInfo.avatar)
    const receiverIds = groupMemberList.data.map((userInfo: any) => userInfo.userId)
    avatarUrlList.push(avatar)

    // 更新群聊头像
    const groupAvatar = await (window as any).mediaHandleApi.updateGroupAvatar(avatarUrlList)
    const groupAvatarBlob = new Blob([groupAvatar])

    const formData = new FormData()
    formData.append('groupAvatarBlob', groupAvatarBlob)
    formData.append('conversationId', application.conversationId as string)
    formData.append('userId', application.userId as string)
    formData.append('memberId', userId)
    formData.append('status', '2')

    const conversationRes: any = await dealGroupApplyApi(formData)
    if (conversationRes.code === 1) {
      ElMessage.success('入群成功')
      // 更新群聊申请状态
      userApplyStore.updateGroupApplyStatus(application.id as string, 2)

      const conversationPack = conversationRes.data

      // 将群聊会话添加到本地数据库
      addConversation(conversationPack)
      // 群会话添加到缓存
      conversationStore.setConversationMap(conversationPack.id, conversationPack)

      // 发送自己入群的通知，需要提供部分信息，用于新成员的展示
      const wsGroupMemberPack = {
        conversationId: application.conversationId,
        userId: userId,
        username: username,
        avatar: avatar,
        role: 0,
        receiverIds: receiverIds
      }
      ;(window as any).wsApi.sendMessage(17, 0, wsGroupMemberPack)

      // 发送入群成功的系统通知
      const tpl = getSystemMsgText(SystemMsgSubType.GROUP_JOINED, { name: username })
      const content = createContentJson(tpl, username, '', '', '')

      const systemMessagePack = await createSystemMessagePack(
        conversationPack.id,
        conversationPack.id,
        SystemMsgSubType.GROUP_JOINED,
        content,
        receiverIds
      )

      messageStore.sendSystemMessage(
        systemMessagePack as Message,
        conversationPack.id,
        receiverIds as string[]
      )
    } else {
      ElMessage.error('入群失败')
    }
  } catch {
    ElMessage.error('处理群聊邀请失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 拒绝邀请
const refuseButton = async () => {
  if (isLoading.value || !groupApplyInfo.value || groupApplyInfo.value.status !== 1) return
  const application = groupApplyInfo.value
  isLoading.value = true
  try {
    const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
    const formData = new FormData()
    formData.append('groupAvatarBlob', new Blob())
    formData.append('conversationId', application.conversationId)
    formData.append('userId', String(application.userId))
    formData.append('memberId', userId)
    formData.append('status', '3')
    const res: any = await dealGroupApplyApi(formData)
    if (res.code !== 1) throw new Error(res.msg || '处理失败')
    userApplyStore.updateGroupApplyStatus(application.id, 3)
    ElMessage.success('已拒绝群聊邀请')
  } catch {
    ElMessage.error('处理群聊邀请失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const groupApplyInfo = computed(() => {
  return UserApplyListStore.getGroupApplyMap(route.query.applyId as string)
})
</script>
