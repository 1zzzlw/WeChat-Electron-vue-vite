<template>
  <main class="contact-detail-page groupInfo-count">
    <article class="contact-detail-card groupInfo">
      <header class="detail-identity">
        <el-avatar :size="72" :src="groupBaseInfo?.avatar || groupExtraInfo.groupAvatar"
          >群</el-avatar
        >
        <div class="detail-heading">
          <p class="detail-eyebrow">GROUP PROFILE · 群聊资料</p>
          <h1>
            {{ groupBaseInfo?.remark || groupBaseInfo?.name || groupExtraInfo.groupName || '群聊' }}
          </h1>
          <p class="detail-id">群号 · {{ route.query.conversationId }}</p>
        </div>
        <el-popover placement="bottom-end" trigger="click" :width="180"
          ><div class="group-menu">
            <el-button v-if="isOwner" text :icon="Edit" @click="editGroupName"
              >修改群聊名称</el-button
            ><el-button text :icon="User" @click="toggleMemberList">{{
              showMemberList ? '返回群信息' : '查看群成员'
            }}</el-button
            ><el-button
              text
              :icon="SwitchButton"
              class="danger-action"
              @click="isOwner ? dissolveGroup() : exitGroup()"
              >{{ isOwner ? '解散群聊' : '退出群聊' }}</el-button
            >
          </div>
          <template #reference
            ><el-button
              class="detail-menu"
              :icon="MoreFilled"
              aria-label="群聊更多操作" /></template
        ></el-popover>
      </header>
      <p v-if="detailError" class="detail-error">
        {{ detailError }}
        <el-button
          text
          @click="loadGroupDetail"
          >重试</el-button
        >
      </p>
      <template v-if="!showMemberList"
        ><section class="detail-section">
          <h2>群聊概况</h2>
          <dl class="detail-grid">
            <div>
              <dt>群成员</dt>
              <dd>{{ groupExtraInfo.memberCount || memberList.length }} 人</dd>
            </div>
            <div>
              <dt>群主 ID</dt>
              <dd>{{ groupExtraInfo.ownerId || '暂无资料' }}</dd>
            </div>
          </dl>
        </section>
        <section class="detail-section">
          <h2>群简介</h2>
          <p class="detail-message">{{ groupExtraInfo.groupDesc || '群主还没有填写群简介。' }}</p>
        </section>
        <section class="detail-section" v-if="groupExtraInfo.notice">
          <h2>群公告</h2>
          <p class="detail-message">{{ groupExtraInfo.notice }}</p>
        </section>
        <section class="detail-section">
          <div class="member-section-title">
            <h2>群成员</h2>
            <el-button text @click="toggleMemberList"
              >查看全部 {{ memberList.length }} 人</el-button
            >
          </div>
          <div class="member-preview">
            <img
              v-for="member in memberList.slice(0, 8)"
              :key="member.userId"
              :src="member.avatar"
              :alt="member.username"
              :title="member.username"
            />
          </div></section
      ></template>
      <section v-else class="detail-section">
        <div class="member-section-title">
          <h2>全部群成员 · {{ memberList.length }} 人</h2>
          <el-button text @click="showMemberList = false">返回概况</el-button>
        </div>
        <div class="member-grid">
          <div v-for="member in memberList" :key="member.userId" class="member-item">
            <img :src="member.avatar" :alt="member.username" /><span>{{
              member.username || '用户'
            }}</span
            ><small>{{
              member.role === 2
                ? '群主'
                : member.role === 1
                  ? '管理员'
                  : member.isMute === 1
                    ? '已禁言'
                    : '成员'
            }}</small>
          </div>
        </div>
        <p class="detail-empty" v-if="!memberList.length">暂无成员资料</p>
      </section>
      <footer class="detail-actions">
        <el-button type="primary" @click="sendMessage">发消息</el-button>
      </footer>
    </article>
  </main>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import '@/css/contactDetail.css'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, User, SwitchButton, MoreFilled } from '@element-plus/icons-vue'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { groupMemberInfo } from '@/stores/modules/GroupMemberStore'
import { groupListInfo } from '@/stores/modules/GroupListStore'
import { getConversationInfoById, updateConversation } from '@/db/dualDB'
import {
  updateGroupInfoApi,
  GroupNumberExitApi,
  getGroupMemberListApi,
  getGroupDetailApi,
  dissolveGroupApi
} from '@/api/Conversation'
import { deleteConversationSync } from '@/db/syncDB'
import dayjs from 'dayjs'

const conversationStore = conversationInfo()
const groupMemberStore = groupMemberInfo()
const groupListStore = groupListInfo()
const route = useRoute()
const router = useRouter()

const groupBaseInfo = computed(() =>
  conversationStore.getGroupConversationInfo(route.query.conversationId as string)
)

// 群额外信息（从API或groupListStore获取）
const groupExtraInfo = ref<any>({})
const detailError = ref('')

// 是否显示成员列表
const showMemberList = ref(false)

// 当前用户ID（异步获取）
const currentUserId = ref<string | number>('')

// 当前用户是否是群主
const isOwner = computed(() => {
  const conversationId = route.query.conversationId as string
  if (!currentUserId.value) return false
  return (
    String(groupExtraInfo.value.ownerId || '') === String(currentUserId.value) ||
    groupListStore.isOwner(conversationId, currentUserId.value) ||
    false
  )
})

// 当前群的成员列表
const memberList = computed(() => {
  const conversationId = route.query.conversationId as string
  return groupMemberStore.getGroupMemberList(conversationId) || []
})

// 加载群详情信息
const loadGroupDetail = async () => {
  const conversationId = route.query.conversationId as string
  detailError.value = ''
  try {
    const res: any = await getGroupDetailApi(conversationId)
    if (conversationId !== route.query.conversationId) return
    if (res.code !== 1 || !res.data) throw new Error('群资料加载失败')
    if (res.data) {
      groupExtraInfo.value = res.data
    }
  } catch (e) {
    if (conversationId !== route.query.conversationId) return
    detailError.value = '部分群资料加载失败'
    console.log('获取群详情失败，使用本地数据')
    // 从 groupListStore 获取 ownerId
    const groupInfo = groupListStore.groupListMap[conversationId]
    if (groupInfo) {
      groupExtraInfo.value = {
        ownerId: groupInfo.ownerId
      }
    }
  }
}

// 加载群成员列表
const loadGroupMembers = async () => {
  const conversationId = route.query.conversationId as string
  const existingMembers = groupMemberStore.getGroupMemberList(conversationId)
  if (!existingMembers || existingMembers.length === 0) {
    try {
      const res = await getGroupMemberListApi(conversationId)
      if (res.data) {
        res.data.forEach((item: any) => {
          groupMemberStore.addGroupMember(conversationId, {
            conversationId,
            userId: item.userId,
            username: item.username,
            role: item.role,
            avatar: item.avatar,
            isMute: item.isMute
          })
        })
      }
    } catch (e) {
      console.log('加载群成员失败')
    }
  }
}

// 切换成员列表显示
const toggleMemberList = async () => {
  if (!showMemberList.value) {
    // 切换到成员列表视图前，确保成员已加载
    await loadGroupMembers()
  }
  showMemberList.value = !showMemberList.value
}

// ===== 修改群聊名称 =====
const editGroupName = async () => {
  try {
    const { value: newName } = await ElMessageBox.prompt('请输入新的群名称', '修改群聊名称', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: groupBaseInfo.value?.name || '',
      inputPattern: /^.{1,30}$/,
      inputErrorMessage: '群名称长度需在 1-30 个字符之间',
      customClass: 'group-name-dialog'
    })

    const conversationId = route.query.conversationId as string
    await updateGroupInfoApi({
      conversationId,
      groupName: newName
    })

    // 更新本地 store
    conversationStore.setConversationMap(conversationId, { name: newName })
    ElMessage.success('群名称已修改')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('修改群名称失败')
    }
  }
}

// ===== 解散群聊（群主操作） =====
const dissolveGroup = async () => {
  try {
    await ElMessageBox.confirm('确定要解散此群聊吗？解散后所有成员将被移出群聊。', '解散群聊', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'group-action-dialog'
    })
  } catch {
    return
  }

  const conversationId = route.query.conversationId as string

  try {
    await dissolveGroupApi(conversationId)
  } catch (e) {
    ElMessage.error('解散群聊失败')
    return
  }

  // 本地清理
  deleteConversationSync(conversationId)
  conversationStore.deleteConversation(conversationId)

  ElMessage.success('已解散群聊')
  router.push({ name: 'messageList' })
}

// ===== 退出群聊（普通成员操作） =====
const exitGroup = async () => {
  try {
    await ElMessageBox.confirm('确定要退出此群聊吗？', '退出群聊', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'group-action-dialog'
    })
  } catch {
    return
  }

  const conversationId = route.query.conversationId as string

  try {
    await GroupNumberExitApi(conversationId)
  } catch (e) {
    ElMessage.error('退出群聊失败')
    return
  }

  // 本地清理
  deleteConversationSync(conversationId)
  conversationStore.deleteConversation(conversationId)

  ElMessage.success('已退出群聊')
  router.push({ name: 'messageList' })
}

// 发消息方法
const sendMessage = async () => {
  const conversationId = route.query.conversationId as string

  const conversationInfo = await getConversationInfoById(conversationId)
  conversationInfo.latestMsgTime =
    conversationInfo.latestMsgTime !== null
      ? dayjs(conversationInfo.latestMsgTime).format('HH:mm:ss')
      : undefined
  // 将信息添加到会话缓存中
  conversationStore.setConversationMap(conversationId, conversationInfo)
  // 修改会话的显示状态为1
  const condition = {
    id: conversationId
  }
  const data = {
    status: 1
  }
  updateConversation(condition, data)
  router.push({
    name: 'chat',
    query: { conversationId: conversationId }
  })
}

watch(
  () => route.query.conversationId,
  async () => {
    detailError.value = ''
    groupExtraInfo.value = {}
    showMemberList.value = false
    // 获取当前用户ID
    try {
      const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
      currentUserId.value = userId
    } catch (e) {
      console.log('获取用户ID失败')
    }
    loadGroupDetail()
    loadGroupMembers()
  },
  { immediate: true }
)
</script>
<style scoped>
.group-menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.group-menu .el-button {
  margin: 0;
  justify-content: flex-start;
}
.danger-action {
  color: var(--color-danger);
}
.member-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.member-section-title h2 {
  margin: 0;
}
.member-preview {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.member-preview img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
}
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 24px 12px;
}
.member-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--color-text-primary);
}
.member-item img {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--color-surface-2);
}
.member-item span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-item small {
  font-size: 10px;
  color: var(--color-text-muted);
}
.detail-error {
  color: var(--color-danger);
  font-size: 12px;
  padding-top: 12px;
}
</style>
