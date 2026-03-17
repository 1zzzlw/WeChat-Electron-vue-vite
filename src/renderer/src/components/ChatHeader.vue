<template>
    <div class="chat-header">
        <div class="title">
            {{ conversation.remark || conversation.name }}
        </div>
        <div class="chat-set">
            <el-icon class="left-icon" size="25" @click="openDrawer()">
                <MoreFilled />
            </el-icon>
            <el-drawer v-model="drawerPrivate" title="" modal-penetrable :show-close="false">
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
                        <a @click="deleteFriend">删除好友</a>
                    </div>
                </div>
            </el-drawer>
            <el-drawer v-model="drawerGroup" title="" modal-penetrable :show-close="false">
                <div class="group-drawer-content">
                    <!-- 群信息头部 -->
                    <div class="group-header">
                        <div class="group-avatar">
                            <img :src="conversation.avatar + '?t=' + Date.now()" alt="群头像">
                        </div>
                        <div class="group-name">{{ conversation.remark || conversation.name }}</div>
                        <div class="group-id">群号：{{ conversation.id || '---' }}</div>
                    </div>

                    <!-- 群设置选项 -->
                    <div class="group-settings">
                        <div class="setting-item">
                            <span class="setting-label">设为置顶</span>
                            <el-switch v-model="conversation.isTop" :active-value="1" :inactive-value="0"
                                @change="changeTopStatus" />
                        </div>

                        <div class="setting-item">
                            <span class="setting-label">消息免打扰</span>
                            <el-switch v-model="conversation.isMute" :active-value="1" :inactive-value="0"
                                @change="changeMuteStatus" />
                        </div>
                    </div>

                    <!-- 群成员区域 -->
                    <div class="group-members">
                        <div class="members-header">
                            <span class="members-title">群成员（{{ groupList?.length || 0 }}）</span>
                            <el-icon class="members-more">
                                <ArrowRight />
                            </el-icon>
                        </div>
                        <div class="members-list">
                            <div v-for="groupMember in groupList" :key="groupMember.userId">
                                <ContextMenu :menu="[
                                    { label: '设置为管理员' },
                                    { label: '踢出群聊' },
                                    { label: '禁言' },
                                ]" @select="(item: any) => handleChoice(item)">
                                    <!-- 群主 -->
                                    <div v-if="groupMember.role === 2" class="member-item owner">
                                        <img :src="groupMember.avatar" class="member-avatar">
                                        <span class="member-name">群主</span>
                                    </div>
                                    <!-- 管理员 -->
                                    <div v-if="groupMember.role === 1" class="member-item admin">
                                        <img :src="groupMember.avatar" class="member-avatar">
                                        <span class="member-name">管理员</span>
                                    </div>
                                    <!-- 普通成员 -->
                                    <div v-if="groupMember.role === 0" class="member-item">
                                        <img :src="groupMember.avatar" class="member-avatar">
                                        <span class="member-name">成员</span>
                                    </div>
                                </ContextMenu>
                            </div>
                            <!-- 更多成员入口 -->
                            <div class="member-item more">
                                <el-icon>
                                    <More />
                                </el-icon>
                                <span>查看更多</span>
                            </div>
                        </div>
                    </div>

                    <!-- 群公告 -->
                    <div class="group-notice">
                        <div class="notice-header">
                            <el-icon>
                                <Bell />
                            </el-icon>
                            <span>群公告</span>
                        </div>
                        <div class="notice-content">
                            {{ conversation.notice || '暂无群公告' }}
                        </div>
                    </div>

                    <!-- 底部操作按钮 -->
                    <div class="group-actions">
                        <a class="action-btn danger" v-if="userInfo.role === 2" @click="dismissGroup">
                            <el-icon>
                                <Delete />
                            </el-icon>
                            <span>解散群聊</span>
                        </a>
                        <a class="action-btn secondary" v-else @click="exitGroup">
                            <el-icon>
                                <SwitchButton />
                            </el-icon>
                            <span>退出群聊</span>
                        </a>
                    </div>
                </div>
            </el-drawer>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { updateConversationTopStatus, updateConversationMuteStatus, clearHistoryMessageSync } from '../db/syncDB';
import { messageInfo } from '../stores/modules/MessageStore';
import { ElMessage } from 'element-plus';
import { groupMemberInfo } from '../stores/modules/GroupMemberStores';
import ContextMenu from '../components/ContextMenu.vue'
import { groupListInfo } from '../stores/modules/GroupListStores';

const messageStore = messageInfo()
const groupMemberStore = groupMemberInfo()
const groupListStore = groupListInfo()

// 抽屉状态
const drawerPrivate = ref(false)
const drawerGroup = ref(false)
const userInfo = ref()

const openDrawer = () => {
    if (props.conversation.type === 0) {
        // 单聊
        drawerPrivate.value = true
    } else {
        // 群聊
        drawerGroup.value = true
    }
}

const changeTopStatus = () => {
    updateConversationTopStatus(props.conversation.id, props.conversation.userId, props.conversation.isTop)
}

const changeMuteStatus = () => {
    updateConversationMuteStatus(props.conversation.id, props.conversation.userId, props.conversation.isMute)
}

const exitGroup = () => {

}

const dismissGroup = () => {

}

const handleChoice = (item: any) => {
    console.log(item)
}

const clearMessageHistory = () => {
    messageStore.clearConversationMessages(props.conversation.id)
    clearHistoryMessageSync(props.conversation.id)
    ElMessage.success('聊天记录清理成功')
}

const deleteFriend = () => {

}

const props = defineProps({
    conversation: {
        type: Object,
        default: {}
    }
})

const groupList = computed(() => {
    if (props.conversation.type === 1) {
        // 是群聊时，获取群成员列表
        return groupMemberStore.getGroupMemberList(props.conversation.id).sort((a: any, b: any) => {
            if (a.role === 2) return -1
            if (b.role === 2) {
                userInfo.value = b
                return 1
            }
            return 0;
        }).slice(0, 5)
    }
})

watch(() => props.conversation.id, async () => {
    drawerPrivate.value = false
    drawerGroup.value = false
}, {
    immediate: true
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

.group-drawer-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 30px 20px 20px;
    box-sizing: border-box;
    overflow-y: auto;
}

/* 群信息头部 */
.group-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 35px;
    padding-bottom: 25px;
    border-bottom: 1px solid rgba(66, 153, 225, 0.3);
}

.group-avatar {
    position: relative;
    width: 100px;
    height: 100px;
    margin-bottom: 15px;
}

.group-avatar img {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.avatar-badge {
    position: absolute;
    bottom: -5px;
    right: -5px;
    padding: 4px 10px;
    background: rgba(66, 153, 225, 0.9);
    border-radius: 12px;
    font-size: 11px;
    color: #fff;
    font-weight: 500;
    border: 2px solid rgba(28, 38, 50, 0.8);
}

.group-name {
    font-size: 20px;
    font-weight: 600;
    color: #f0f0f0;
    margin-bottom: 6px;
}

.group-id {
    font-size: 13px;
    color: rgba(240, 240, 240, 0.5);
}

/* 群设置选项 */
.group-settings {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 30px;
    padding: 15px 0;
    border-bottom: 1px solid rgba(66, 153, 225, 0.2);
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 36px;
}

.setting-label {
    font-size: 14px;
    color: rgba(240, 240, 240, 0.85);
}

:deep(.el-switch) {
    --el-switch-on-color: #5dade2;
    --el-switch-off-color: rgba(240, 240, 240, 0.25);
    --el-switch-core-border-color: rgba(240, 240, 240, 0.25);
}

/* 群成员区域 */
.group-members {
    width: 100%;
    margin-bottom: 25px;
}

.members-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 0 5px;
}

.members-title {
    font-size: 15px;
    font-weight: 500;
    color: rgba(240, 240, 240, 0.9);
}

.members-more {
    color: rgba(240, 240, 240, 0.5);
    font-size: 16px;
    cursor: pointer;
    transition: color 0.2s;
}

.members-more:hover {
    color: rgba(240, 240, 240, 0.8);
}

.members-list {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 15px 10px;
    padding: 10px 5px;
}

.member-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 8px 4px;
    border-radius: 8px;
    transition: background 0.2s;
}

.member-item:hover {
    background: rgba(66, 153, 225, 0.1);
}

.member-avatar {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.member-name {
    font-size: 11px;
    color: rgba(240, 240, 240, 0.7);
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.member-item.owner .member-avatar {
    border: 2px solid #f39c12;
}

.member-item.admin .member-avatar {
    border: 2px solid #3498db;
}

.member-item.more {
    justify-content: center;
    color: rgba(240, 240, 240, 0.6);
}

.member-item.more .el-icon {
    font-size: 20px;
    margin-bottom: 4px;
}

.member-item.more span {
    font-size: 10px;
}

/* 群公告 */
.group-notice {
    width: 100%;
    padding: 15px;
    background: rgba(66, 153, 225, 0.08);
    border-radius: 10px;
    border: 1px solid rgba(66, 153, 225, 0.2);
    margin-bottom: auto;
}

.notice-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.notice-header .el-icon {
    color: #5dade2;
    font-size: 16px;
}

.notice-header span {
    font-size: 14px;
    font-weight: 500;
    color: rgba(240, 240, 240, 0.9);
}

.notice-content {
    font-size: 13px;
    color: rgba(240, 240, 240, 0.65);
    line-height: 1.6;
    word-break: break-all;
}

.notice-content:empty::before {
    content: '暂无群公告';
    color: rgba(240, 240, 240, 0.4);
    font-style: italic;
}

/* 底部操作按钮 */
.group-actions {
    width: 100%;
    display: flex;
    gap: 15px;
    padding-top: 20px;
    margin-top: 10px;
    border-top: 1px solid rgba(66, 153, 225, 0.2);
}

.action-btn {
    flex: 1;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s ease;
    text-decoration: none;
    color: rgba(240, 240, 240, 0.9);
}

.action-btn.secondary {
    background: rgba(240, 240, 240, 0.1);
    border: 1px solid rgba(240, 240, 240, 0.15);
}

.action-btn.secondary:hover {
    background: rgba(240, 240, 240, 0.18);
    border-color: rgba(240, 240, 240, 0.25);
}

.action-btn.danger {
    background: rgba(231, 76, 60, 0.15);
    border: 1px solid rgba(231, 76, 60, 0.3);
    color: #e74c3c;
}

.action-btn.danger:hover {
    background: rgba(231, 76, 60, 0.25);
    border-color: rgba(231, 76, 60, 0.5);
}

.action-btn:active {
    transform: scale(0.98);
}

/* 滚动条样式 */
.group-drawer-content::-webkit-scrollbar {
    width: 4px;
}

.group-drawer-content::-webkit-scrollbar-track {
    background: transparent;
}

.group-drawer-content::-webkit-scrollbar-thumb {
    background: rgba(240, 240, 240, 0.2);
    border-radius: 2px;
}

.group-drawer-content::-webkit-scrollbar-thumb:hover {
    background: rgba(240, 240, 240, 0.35);
}
</style>