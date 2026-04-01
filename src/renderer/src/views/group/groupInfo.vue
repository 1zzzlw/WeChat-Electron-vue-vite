<template>
    <div class="groupInfo-count">
        <div class="groupInfo">
            <el-popover placement="bottom" trigger="click" :width="180">
                <div class="setButton">
                    <div>修改群聊名称</div>
                    <div>查看群成员</div>
                    <div>退出群聊</div>
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

            <div class="groupBaseInfo">

            </div>

            <div class="groupMoments">
                群聊动态
            </div>

            <div class="button">
                <el-button @click="sendMessage">发消息</el-button>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MoreFilled } from '@element-plus/icons-vue'
import { conversationInfo } from '../../stores/modules/ConversationStore'
import { getConversationInfoById, updateConversation } from '../../db/dualDB'
import dayjs from 'dayjs'

const conversationStore = conversationInfo()
const route = useRoute()
const router = useRouter()

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
        // 传递会话id
        query: { conversationId: conversationId }
    })
}

const groupBaseInfo = computed(() => conversationStore.getGroupConversationInfo(route.query.conversationId as string))
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
</style>