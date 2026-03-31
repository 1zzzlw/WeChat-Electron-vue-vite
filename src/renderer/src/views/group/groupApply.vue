<template>
    <div class="groupApply-count">
        <div class="groupApply-info">
            <div class="info-top">
                <img :src="groupApplyInfo?.userAvatar" alt="" class="img" />
                <h1>{{ groupApplyInfo?.groupName || '测试群聊' }}</h1>
            </div>
            <div class="info-mid">
                <div class="title">群聊信息</div>
                <div class="group-detail">
                    <div class="detail-item">
                        <span class="label">群ID：</span>
                        <span class="value">{{ groupApplyInfo?.conversationId }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">群公告：</span>
                        <span class="value">{{ '欢迎加入本群聊！' }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">成员总数：</span>
                        <span class="value">{{ 15 }}人</span>
                    </div>
                </div>
            </div>
            <div class="info-bottom">
                <div class="btn-group" v-if="groupApplyInfo?.status == 1">
                    <el-button type="success" @click="agreeButton" :loading="isLoading">同意</el-button>
                    <el-button type="danger" @click="refuseButton">拒绝</el-button>
                </div>
                <div class="btn-group" v-else>
                    <el-button type="success" disabled v-if="groupApplyInfo?.status == 2">已同意</el-button>
                    <el-button type="danger" disabled v-else-if="groupApplyInfo?.status == 3">已拒绝</el-button>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { userApplyListInfo } from '../../stores/modules/UserApplyListStore'
import { ElMessage } from 'element-plus'
import { getGroupMemberListApi } from '../../api/Conversation'
import { groupMemberInfo } from '../../stores/modules/GroupMemberStores'
import { addConversation } from '../../db/dualDB'
import { conversationInfo } from '../../stores/modules/ConversationStore'
import { dealGroupApplyApi } from '../../api/Apply'

const route = useRoute()
const UserApplyListStore = userApplyListInfo()
const userApplyStore = userApplyListInfo()
const groupMemberStore = groupMemberInfo()
const conversationStore = conversationInfo()
const isLoading = ref(false)

// 同意申请
const agreeButton = async () => {
    console.info(groupApplyInfo)
    isLoading.value = true
    const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
    const username = await (window as any).userInfoApi.storeGetUserInfo('username')
    const avatar = await (window as any).userInfoApi.storeGetUserInfo('avatar')

    console.info('用户', userId, '同意入群');

    // 获取群成员信息列表
    const groupMemberList: any = await getGroupMemberListApi(groupApplyInfo.value?.conversationId)

    const avatarUrlList = groupMemberList.data.map((userInfo: any) => userInfo.avatar)
    avatarUrlList.push(avatar)
    console.log(avatarUrlList)

    // 更新群聊头像
    const groupAvatar = await (window as any).mediaHandleApi.updateGroupAvatar(avatarUrlList)
    const groupAvatarBlob = new Blob([groupAvatar])

    const formData = new FormData()
    formData.append('groupAvatarBlob', groupAvatarBlob)
    formData.append('conversationId', groupApplyInfo.value?.conversationId as string)
    formData.append('userId', groupApplyInfo.value?.userId as string)
    formData.append('memberId', userId)
    formData.append('status', '2')

    const conversationRes: any = await dealGroupApplyApi(formData)
    console.log(conversationRes)
    if (conversationRes.code === 1) {
        ElMessage.success('入群成功')
        // 更新群聊申请状态
        userApplyStore.updateGroupApplyStatus(groupApplyInfo.value?.userId as string, 2)
        // 将自己的信息添加到群成员缓存中
        groupMemberStore.addGroupMember(groupApplyInfo.value?.conversationId as string, {
            conversationId: groupApplyInfo.value?.conversationId as string,
            userId: userId,
            username: username,
            role: 0,
            avatar: avatar
        })
        const conversationPack = conversationRes.data
        // 将群聊会话添加到本地数据库
        addConversation(conversationPack)
        // 群会话添加到缓存
        conversationStore.setConversationMap(conversationPack.id, conversationPack)

        // 发送自己入群的系统通知，需要提供部分信息，用于新成员的展示


    } else {
        ElMessage.error('入群失败')
    }
}

// 拒绝申请
const refuseButton = async () => {
    const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')

    const formData = new FormData()
    const groupAvatarBlob = new Blob()
    formData.append('groupAvatarBlob', groupAvatarBlob)
    formData.append('conversationId', groupApplyInfo.value?.conversationId as string)
    formData.append('userId', groupApplyInfo.value?.userId as string)
    formData.append('memberId', userId)
    formData.append('status', '3')

    console.info('用户', userId, '忽略入群:')
    dealGroupApplyApi(formData).then((res: any) => {
        if (res.code === 1) {
            ElMessage.success('忽略入群成功')
            userApplyStore.updateGroupApplyStatus(groupApplyInfo.value?.userId as string, 3)
        } else {
            ElMessage.error('忽略入群失败')
        }
    })
}

const groupApplyInfo = computed(() => {
    return UserApplyListStore.getGroupApplyMap(route.query.applyId as string)
})
</script>
<style scoped>
.groupApply-count {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.groupApply-info {
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

.groupApply-info:hover {
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
    justify-content: flex-start;
    align-items: flex-start;
    padding: 40px;
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

.group-detail {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
    margin-top: 20px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.label {
    color: rgba(255, 255, 255, 0.85);
    font-size: 16px;
    font-weight: 500;
    min-width: 80px;
}

.value {
    color: rgba(255, 255, 255, 0.75);
    font-size: 16px;
    line-height: 1.6;
    word-break: break-all;
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