<template>
    <div class="chat-header">
        <div class="title">
            {{ conversation.remark || conversation.name }}
        </div>
        <div class="chat-set">
            <el-icon class="left-icon" size="25" @click="drawer = true">
                <MoreFilled />
            </el-icon>
            <el-drawer v-model="drawer" title="" modal-penetrable :show-close="false">
                <div class="chat-set-content">
                    <div class="avatar">
                        <img :src="conversation.avatar" alt="">
                        <div>{{ conversation.remark || conversation.name }}</div>
                    </div>
                    <div class="conversation-set">
                        <div class="set1">
                            <span>设为置顶</span>
                            <el-switch v-model="conversation.isTop" :active-value=1 :inactive-value=0
                                @change="changeTopStatus" />
                        </div>
                        <div class="set2">
                            <span>消息免打扰</span>
                            <el-switch v-model="conversation.isMute" :active-value=1 :inactive-value=0
                                @change="changeMuteStatus" />
                        </div>
                    </div>
                    <div class="button">
                        <a @click="clearMessageHistory">清空聊天记录</a>
                        <a @click="openMessageHistory">查看聊天记录</a>
                        <a @click="deleteFriend">删除好友</a>
                    </div>
                </div>
            </el-drawer>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { updateConversationTopStatus, updateConversationMuteStatus } from '../db/syncDB';

// 抽屉状态
const drawer = ref(false)

const changeTopStatus = () => {
    updateConversationTopStatus(props.conversation.id, props.conversation.userId, props.conversation.isTop)
}

const changeMuteStatus = () => {
    updateConversationMuteStatus(props.conversation.id, props.conversation.userId, props.conversation.isMute)
}

const clearMessageHistory = () => {

}

const openMessageHistory = () => {

}

const deleteFriend = () => {

}

const props = defineProps({
    conversation: {
        type: Object,
        default: {}
    }
})
</script>

<style scoped>
.chat-header {
    height: 70px;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(66, 153, 225, 0.5);
    -webkit-app-region: drag;
    color: #f0f0f0;
}

.left-icon {
    position: absolute;
    top: 30px;
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

:deep(.el-drawer) {
    width: 50% !important;
    --el-drawer-bg-color: rgba(28, 38, 50, 0.4);
    background-color: var(--el-drawer-bg-color);
    backdrop-filter: blur(10px);
    border-left: 1px solid rgba(66, 153, 225, 0.5);
}

:deep(.el-drawer__body) {
    padding: 20px 16px;
    color: #f0f0f0;
    overflow: hidden;
}

.chat-set-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px 20px;
    box-sizing: border-box;
}

.avatar {
    width: auto;
    height: auto;
    margin-bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
}

.avatar img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 0;
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.avatar div {
    font-size: 18px;
    font-weight: 500;
    color: #f0f0f0;
}

.conversation-set {
    width: 80%;
    display: flex;
    flex-direction: column;
    gap: 25px;
    margin-bottom: 40px;
}

.conversation-set .set1,
.conversation-set .set2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 40px;
}

.conversation-set .set1 el-switch,
.conversation-set .set2 el-switch {
    flex-shrink: 0;
}

:deep(.el-switch) {
    --el-switch-on-color: #5dade2;
    --el-switch-off-color: rgba(240, 240, 240, 0.3);
    --el-switch-core-border-color: rgba(240, 240, 240, 0.3);
}

.button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-top: auto;
}

.button a {
    flex: 1;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    box-sizing: border-box;
}

.button a:last-child {
    color: red;
}
</style>