<template>
    <div class="groupInfo-count">
        <div class="groupInfo">
            <el-popover placement="bottom-end" trigger="click" :width="180" transition="group-pop-transition">
                <div class="setButton">
                    <div class="set-item" @click="editGroupName" v-if="isOwner">
                        <el-icon>
                            <Edit />
                        </el-icon>
                        <span>修改群聊名称</span>
                    </div>
                    <div class="set-item" @click="toggleMemberList">
                        <el-icon>
                            <User />
                        </el-icon>
                        <span>{{ showMemberList ? '返回群信息' : '查看群成员' }}</span>
                    </div>
                    <div class="set-divider" v-if="isOwner"></div>
                    <div class="set-item danger" @click="isOwner ? dissolveGroup() : exitGroup()">
                        <el-icon>
                            <SwitchButton />
                        </el-icon>
                        <span>{{ isOwner ? '解散群聊' : '退出群聊' }}</span>
                    </div>
                </div>
                <template #reference>
                    <el-icon class="left-icon" size="25">
                        <MoreFilled />
                    </el-icon>
                </template>
            </el-popover>
            <div class="groupAccountInfo">
                <img :src="groupBaseInfo?.avatar + '?t=' + Date.now()" alt="群聊头像">
                <div class="groupAccountInfo-info">
                    <p>群聊名称: {{ groupBaseInfo?.name }}</p>
                    <span>群聊ID: {{ groupBaseInfo?.id }} </span>
                </div>
            </div>

            <!-- 群基本信息（非成员列表视图时显示） -->
            <div class="groupBaseInfo" v-show="!showMemberList">
                <div v-if="groupExtraInfo.groupDesc">群简介: {{ groupExtraInfo.groupDesc }}</div>
                <div>群成员: {{ groupExtraInfo.memberCount || memberList.length }}人</div>
                <div v-if="groupExtraInfo.ownerId">群主ID: {{ groupExtraInfo.ownerId }}</div>
            </div>

            <!-- 群成员列表（点击查看群成员时显示） -->
            <div class="memberListContainer" v-show="showMemberList">
                <div class="member-grid">
                    <div v-for="member in memberList" :key="member.userId" class="member-item">
                        <img :src="member.avatar" class="member-avatar">
                        <span class="member-name">{{ member.username || '用户' }}</span>
                        <span v-if="member.role === 2" class="member-role-tag owner-tag">群主</span>
                        <span v-else-if="member.role === 1" class="member-role-tag admin-tag">管理</span>
                        <span v-if="member.isMute === 1" class="member-role-tag mute-tag">禁言</span>
                    </div>
                </div>
            </div>

            <div class="groupMoments" v-show="!showMemberList">
                群聊动态
            </div>

            <div class="button">
                <el-button @click="sendMessage">发消息</el-button>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, User, SwitchButton, MoreFilled } from '@element-plus/icons-vue'
import { conversationInfo } from '@/stores/modules/ConversationStore'
import { groupMemberInfo } from '@/stores/modules/GroupMemberStore'
import { groupListInfo } from '@/stores/modules/GroupListStore'
import { getConversationInfoById, updateConversation } from '@/db/dualDB'
import { updateGroupInfoApi, GroupNumberExitApi, getGroupMemberListApi, getGroupDetailApi, dissolveGroupApi } from '@/api/Conversation'
import { deleteConversationSync } from '@/db/syncDB'
import dayjs from 'dayjs'

const conversationStore = conversationInfo()
const groupMemberStore = groupMemberInfo()
const groupListStore = groupListInfo()
const route = useRoute()
const router = useRouter()

const groupBaseInfo = computed(() => conversationStore.getGroupConversationInfo(route.query.conversationId as string))

// 群额外信息（从API或groupListStore获取）
const groupExtraInfo = ref<any>({})

// 是否显示成员列表
const showMemberList = ref(false)

// 当前用户ID（异步获取）
const currentUserId = ref<string | number>('')

// 当前用户是否是群主
const isOwner = computed(() => {
    const conversationId = route.query.conversationId as string
    if (!currentUserId.value) return false
    return groupListStore.isOwner(conversationId, currentUserId.value) || false
})

// 当前群的成员列表
const memberList = computed(() => {
    const conversationId = route.query.conversationId as string
    return groupMemberStore.getGroupMemberList(conversationId) || []
})

// 加载群详情信息
const loadGroupDetail = async () => {
    const conversationId = route.query.conversationId as string
    try {
        const res: any = await getGroupDetailApi(conversationId)
        if (res.code === 200 && res.data) {
            groupExtraInfo.value = res.data
        }
    } catch (e) {
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
    conversationInfo.latestMsgTime = conversationInfo.latestMsgTime !== null ? dayjs(conversationInfo.latestMsgTime).format('HH:mm:ss') : undefined
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

onMounted(async () => {
    // 获取当前用户ID
    try {
        const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
        currentUserId.value = userId
    } catch (e) {
        console.log('获取用户ID失败')
    }
    loadGroupDetail()
    loadGroupMembers()
})
</script>
<style scoped>
.groupInfo-count {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.groupInfo {
    width: 660px;
    height: 580px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    background: rgba(70, 100, 130, 0.2);
    backdrop-filter: blur(12px);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    gap: 8px;
    -webkit-app-region: no-drag;
}

.left-icon {
    position: absolute;
    top: 20px;
    right: 20px;
    -webkit-app-region: no-drag;
    width: 30px;
    height: 30px;
    margin: 0;
    font-size: 20px;
    background-color: transparent;
    border: none;
    color: rgba(240, 240, 240, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
}

.left-icon:hover {
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.25);
}

.groupAccountInfo {
    width: 100%;
    height: 120px;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.groupAccountInfo img {
    width: 100px;
    height: 100px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.groupAccountInfo-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
}

.groupAccountInfo-info p,
.groupAccountInfo-info span,
.member-status {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.groupAccountInfo-info p {
    font-size: 18px;
    font-weight: 600;
}

.member-status {
    color: rgba(102, 217, 102, 0.9);
    font-weight: 500;
}

.groupBaseInfo {
    width: 100%;
    height: 220px;
    padding: 15px 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

.groupBaseInfo div {
    color: rgba(255, 255, 255, 0.85);
    font-size: 14px;
    line-height: 1.5;
}

.groupBaseInfo div::before {
    content: "• ";
    color: rgba(255, 255, 255, 0.5);
}

.groupMoments {
    width: 100%;
    height: 140px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
}

.button {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    padding: 0 10px;
}

.el-button {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
    border-radius: 6px;
    transition: all 0.2s ease;
}

.el-button:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.3);
}

/* Popover 内部菜单样式 */
.setButton {
    padding: 4px 0;
}

.set-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.08);
    margin: 4px 8px;
}

.set-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.set-item:hover {
    background: rgba(52, 119, 217, 0.12);
    color: #3477d9;
    transform: translateX(2px);
}

.set-item.danger {
    color: #ff4757;
}

.set-item.danger:hover {
    background: rgba(255, 71, 87, 0.1);
    color: #ff4757;
    transform: translateX(2px);
}

/* ===== 群成员列表样式 ===== */
.memberListContainer {
    width: 100%;
    height: 368px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow-y: auto;
    padding: 12px;
}

.member-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.member-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    width: calc(50% - 6px);
    box-sizing: border-box;
    transition: background 0.2s ease;
}

.member-item:hover {
    background: rgba(255, 255, 255, 0.15);
}

.member-avatar {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
}

.member-name {
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.member-role-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    font-weight: 500;
}

.owner-tag {
    background: rgba(255, 193, 7, 0.2);
    color: rgba(255, 193, 7, 0.9);
    border: 1px solid rgba(255, 193, 7, 0.3);
}

.admin-tag {
    background: rgba(102, 217, 102, 0.2);
    color: rgba(102, 217, 102, 0.9);
    border: 1px solid rgba(102, 217, 102, 0.3);
}

.mute-tag {
    background: rgba(255, 71, 87, 0.15);
    color: rgba(255, 71, 87, 0.9);
    border: 1px solid rgba(255, 71, 87, 0.25);
}

/* 成员列表容器滚动条样式 */
.memberListContainer::-webkit-scrollbar {
    width: 4px;
}

.memberListContainer::-webkit-scrollbar-track {
    background: transparent;
}

.memberListContainer::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
}

.memberListContainer::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

/* ===== 全局弹窗样式（通过 :global 穿透 scoped） ===== */

/* Popover 弹出动画 */
:global(.group-pop-transition-enter-active) {
    transition:
        transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
        opacity 0.2s ease;
}

:global(.group-pop-transition-leave-active) {
    transition:
        transform 0.15s cubic-bezier(0.6, -0.28, 0.735, 0.045),
        opacity 0.15s ease;
}

:global(.group-pop-transition-enter-from) {
    opacity: 0;
    transform: scale(0.92) translateY(-4px);
}

:global(.group-pop-transition-enter-to) {
    opacity: 1;
    transform: scale(1) translateY(0);
}

:global(.group-pop-transition-leave-from) {
    opacity: 1;
    transform: scale(1) translateY(0);
}

:global(.group-pop-transition-leave-to) {
    opacity: 0;
    transform: scale(0.95) translateY(-2px);
}

/* 修改群名弹窗 */
:global(.group-name-dialog) {
    background: rgba(28, 38, 50, 0.97) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(20px) !important;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35) !important;
    padding: 0 !important;
    overflow: hidden;
}

:global(.group-name-dialog .el-message-box__header) {
    padding: 20px 24px 12px !important;
    border-bottom: 1px solid rgba(67, 243, 255, 0.1) !important;
}

:global(.group-name-dialog .el-message-box__title) {
    color: rgba(255, 255, 255, 0.95) !important;
    font-size: 16px !important;
    font-weight: 600 !important;
}

:global(.group-name-dialog .el-message-box__headerbtn .el-message-box__close) {
    color: rgba(255, 255, 255, 0.5) !important;
}

:global(.group-name-dialog .el-message-box__headerbtn:hover .el-message-box__close) {
    color: #43f3ff !important;
}

:global(.group-name-dialog .el-message-box__content) {
    padding: 16px 24px 20px !important;
    color: rgba(255, 255, 255, 0.7) !important;
}

:global(.group-name-dialog .el-message-box__input .el-input__wrapper) {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    border-radius: 8px !important;
    box-shadow: none !important;
}

:global(.group-name-dialog .el-message-box__input .el-input__wrapper.is-focus) {
    border-color: #43f3ff !important;
    box-shadow: 0 0 8px rgba(67, 243, 255, 0.2) !important;
}

:global(.group-name-dialog .el-message-box__input .el-input__inner) {
    color: rgba(255, 255, 255, 0.9) !important;
}

:global(.group-name-dialog .el-message-box__btns) {
    padding: 12px 24px 20px !important;
    display: flex !important;
    gap: 12px !important;
    justify-content: flex-end !important;
}

:global(.group-name-dialog .el-message-box__btns .el-button) {
    border-radius: 8px !important;
    padding: 8px 20px !important;
    font-size: 14px !important;
    transition: all 0.2s ease !important;
}

:global(.group-name-dialog .el-message-box__btns .el-button--default) {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    color: rgba(255, 255, 255, 0.8) !important;
}

:global(.group-name-dialog .el-message-box__btns .el-button--default:hover) {
    background: rgba(67, 243, 255, 0.1) !important;
    border-color: rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
}

:global(.group-name-dialog .el-message-box__btns .el-button--primary) {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.5) !important;
    color: #43f3ff !important;
}

:global(.group-name-dialog .el-message-box__btns .el-button--primary:hover) {
    background: rgba(67, 243, 255, 0.35) !important;
    border-color: rgba(67, 243, 255, 0.7) !important;
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.25) !important;
}

/* 群操作确认弹窗 */
:global(.group-action-dialog) {
    background: rgba(28, 38, 50, 0.97) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(20px) !important;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35) !important;
    padding: 0 !important;
    overflow: hidden;
}

:global(.group-action-dialog .el-message-box__header) {
    padding: 20px 24px 12px !important;
    border-bottom: 1px solid rgba(67, 243, 255, 0.1) !important;
}

:global(.group-action-dialog .el-message-box__title) {
    color: rgba(255, 255, 255, 0.95) !important;
    font-size: 16px !important;
    font-weight: 600 !important;
}

:global(.group-action-dialog .el-message-box__headerbtn .el-message-box__close) {
    color: rgba(255, 255, 255, 0.5) !important;
}

:global(.group-action-dialog .el-message-box__headerbtn:hover .el-message-box__close) {
    color: #43f3ff !important;
}

:global(.group-action-dialog .el-message-box__content) {
    padding: 16px 24px 20px !important;
    color: rgba(255, 255, 255, 0.7) !important;
}

:global(.group-action-dialog .el-message-box__message p) {
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 14px !important;
}

:global(.group-action-dialog .el-message-box__status .el-icon) {
    color: #ff884d !important;
}

:global(.group-action-dialog .el-message-box__btns) {
    padding: 12px 24px 20px !important;
    display: flex !important;
    gap: 12px !important;
    justify-content: flex-end !important;
}

:global(.group-action-dialog .el-message-box__btns .el-button) {
    border-radius: 8px !important;
    padding: 8px 20px !important;
    font-size: 14px !important;
    transition: all 0.2s ease !important;
}

:global(.group-action-dialog .el-message-box__btns .el-button--default) {
    background: rgba(35, 45, 60, 0.8) !important;
    border: 1px solid rgba(67, 243, 255, 0.25) !important;
    color: rgba(255, 255, 255, 0.8) !important;
}

:global(.group-action-dialog .el-message-box__btns .el-button--default:hover) {
    background: rgba(67, 243, 255, 0.1) !important;
    border-color: rgba(67, 243, 255, 0.4) !important;
    color: #43f3ff !important;
}

:global(.group-action-dialog .el-message-box__btns .el-button--primary) {
    background: rgba(67, 243, 255, 0.2) !important;
    border: 1px solid rgba(67, 243, 255, 0.5) !important;
    color: #43f3ff !important;
}

:global(.group-action-dialog .el-message-box__btns .el-button--primary:hover) {
    background: rgba(67, 243, 255, 0.35) !important;
    border-color: rgba(67, 243, 255, 0.7) !important;
    box-shadow: 0 0 12px rgba(67, 243, 255, 0.25) !important;
}
</style>
