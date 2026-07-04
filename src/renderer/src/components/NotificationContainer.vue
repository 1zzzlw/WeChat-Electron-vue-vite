<template>
    <div class="notification-container">
        <TransitionGroup name="slide-fade">
            <!-- 所有通知都会在这里排队渲染 -->
            <component :is="item.component" v-for="item in notifications" :key="item.id" v-bind="item.props"
                @close="removeNotification(item.id)" />
        </TransitionGroup>
    </div>
</template>

<script setup>
import { ref, markRaw } from 'vue'
import emitter from '@/utils/mitt'

const notifications = ref([])
let id = 0
const MAX_NOTIFICATIONS = 4 // 定义最大数量

// 监听全局添加通知事件
emitter.on('addNotification', (payload) => {
    const { component, props, duration = 5000 } = payload || {}

    const item = {
        id: id++,
        component: markRaw(component),
        props: props || {},
        timer: null
    }

    // 超过最大限制时，先删除最旧的通知
    if (notifications.value.length >= MAX_NOTIFICATIONS) {
        const oldestItem = notifications.value[notifications.value.length - 1]
        if (oldestItem.timer) {
            clearTimeout(oldestItem.timer)
        }
        notifications.value.pop()
    }


    // 新通知在最上面
    notifications.value.unshift(item)


    // 自动关闭逻辑（默认3秒）
    if (duration > 0) {
        item.timer = setTimeout(() => {
            removeNotification(item.id)
        }, duration)
    }
})

// 删除通知
const removeNotification = (targetId) => {
    const index = notifications.value.findIndex((i) => i.id === targetId)

    if (index === -1) return

    const item = notifications.value[index]
    if (item.timer) {
        clearTimeout(item.timer)
        item.timer = null
    }

    notifications.value.splice(index, 1)
}
</script>

<style scoped>
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    -webkit-app-region: no-drag;
}

/* 动画样式移到这里，统一管理 */
.slide-fade-enter-from {
    transform: translateX(100%);
    opacity: 0;
}

.slide-fade-enter-to {
    transform: translateX(0);
    opacity: 1;
}

.slide-fade-leave-from {
    transform: translateX(0);
    opacity: 1;
}

.slide-fade-leave-to {
    transform: translateX(100%);
    opacity: 0;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease-out;
}
</style>