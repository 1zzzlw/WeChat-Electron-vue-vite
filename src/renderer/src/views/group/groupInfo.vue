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
                <img :src="groupBaseInfo?.avatar || '/default-group-avatar.png'" alt="群聊头像">
                <div class="groupAccountInfo-info">
                    <p>群聊名称: {{ groupBaseInfo?.groupName }}</p>
                    <span>群聊ID: {{ groupBaseInfo?.groupId }} </span>
                    <div class="member-status">
                        成员总数: {{ groupBaseInfo?.memberCount || 15 }}人 (在线: {{ onlineMemberCount || 5 }}人)
                    </div>
                </div>
            </div>

            <div class="groupBaseInfo">
                <div>群公告: {{ groupBaseInfo?.announcement || '欢迎加入本群聊！' }}</div>
                <div>创建时间: {{ groupBaseInfo?.createTime || '2025-01-01 10:00:00' }}</div>
                <div>群主: {{ groupBaseInfo?.ownerName || '群主用户' }}</div>
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
import { ref } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'

// 群聊基础信息（示例数据）
const groupBaseInfo = ref({
    avatar: '/default-group-avatar.png',
    groupName: '测试群聊',
    groupId: 'group_123456',
    memberCount: 15,
    announcement: '欢迎加入本群聊，一起交流学习！',
    createTime: '2025-01-01 10:00:00',
    ownerName: '群主用户'
})

// 在线成员数量（示例数据）
const onlineMemberCount = ref(5)

// 发消息方法（空实现，后续补充逻辑）
const sendMessage = () => {
    // 此处留空，由你后续实现跳转逻辑
}
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