<template>
    <div ref="containerRef">
        <!-- 插槽 -->
        <slot></slot>
        <Teleport to="body">
            <div v-if="showMenu" class="context-menu" :style="{
                left: x + 'px',
                top: y + 'px',
            }">
                <!-- 阻止点击事件的冒泡事件 -->
                <div class="menu-list" v-for="item in menu" :key="item.label">
                    <div v-if="!item.divider" class="menu-list" @click.stop="handleClick(item)">
                        {{ item.label }}
                    </div>
                    <div v-else class="menu-divider">
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
<script setup>
import { ref } from 'vue'
import useContextMenu from '@/utils/useContextMenu';

// 声明自定义事件名
const emit = defineEmits(['select']);
const containerRef = ref(null)
const { x, y, showMenu } = useContextMenu(containerRef)

const handleClick = (item) => {
    showMenu.value = false
    emit('select', item)
}

const props = defineProps({
    menu: {
        type: Array,
        default: () => []
    }
})

</script>
<style scoped>
.context-menu {
    position: fixed;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2), 1px 1px 5px rgba(0, 0, 0, 0.2);
    min-width: 100px;
    border-radius: 5px;
    font-size: 12px;
    color: #1d1d1f;
    line-height: 1.8;
    white-space: nowrap;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
}

.menu-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.08);
    margin: 6px 0;
}

.menu-list {
    padding: 0 5px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.menu-list:hover {
    background: rgba(52, 119, 217, 0.15);
    color: #3477d9;
    transform: translateX(2px);
}
</style>