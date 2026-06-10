<template>
    <div class="member-item" :class="roleClass">
        <img :src="member.avatar" class="member-avatar">
        <span class="member-name">{{ member.username || roleLabel }}</span>
        <span v-if="member.role === 2" class="member-role-tag owner-tag">群主</span>
        <span v-else-if="member.role === 1" class="member-role-tag admin-tag">管理</span>
        <span v-if="member.isMute === 1" class="member-role-tag mute-tag">禁言</span>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
    member: { userId: string | number; avatar: string; username?: string; role: number; isMute?: number }
}>()

const roleClass = computed(() => {
    if (props.member.role === 2) return 'owner'
    if (props.member.role === 1) return 'admin'
    return ''
})

const roleLabel = computed(() => {
    if (props.member.role === 2) return '群主'
    if (props.member.role === 1) return '管理员'
    return '成员'
})
</script>

<style scoped>
.member-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 8px 4px;
    border-radius: 8px;
    transition: all 0.3s;
}

.member-item:hover {
    background: rgba(67, 243, 255, 0.1);
}

.member-avatar {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid rgba(67, 243, 255, 0.3);
    transition: all 0.3s;
}

.member-item:hover .member-avatar {
    border-color: rgba(67, 243, 255, 0.6);
    box-shadow: 0 0 10px rgba(67, 243, 255, 0.3);
}

.member-name {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.member-role-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: 500;
}

.owner-tag {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.4);
}

.admin-tag {
    background: rgba(67, 243, 255, 0.15);
    color: #43f3ff;
    border: 1px solid rgba(67, 243, 255, 0.3);
}

.mute-tag {
    background: rgba(255, 71, 87, 0.15);
    color: #ff4757;
    border: 1px solid rgba(255, 71, 87, 0.3);
}

.member-item.owner .member-avatar {
    border: 2px solid #ffd700;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
}

.member-item.admin .member-avatar {
    border: 2px solid #43f3ff;
    box-shadow: 0 0 10px rgba(67, 243, 255, 0.4);
}
</style>
