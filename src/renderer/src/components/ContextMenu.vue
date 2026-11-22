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
                <template v-for="(item, index) in menu" :key="item.label || index">
                    <div v-if="item.divider" class="menu-divider"></div>
                    <button v-else type="button" class="menu-list" @click.stop="handleClick(item)">
                        {{ item.label }}
                    </button>
                </template>
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
    z-index: 3000;
    min-width: 160px;
    padding: 6px;
    background: var(--color-bg-deep);
    box-shadow: var(--shadow-md);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--color-text-primary);
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
    -webkit-app-region: no-drag;
}

.menu-divider {
    height: 1px;
    background: var(--color-border-subtle);
    margin: 6px 8px;
}

.menu-list {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: var(--cursor-pointer, pointer);
    transition: background-color var(--transition-fast), color var(--transition-fast);
}

.menu-list:hover,
.menu-list:focus-visible {
    background: var(--color-accent-soft);
    color: var(--color-text-strong);
}

.menu-list:focus-visible {
    outline: 2px solid var(--color-border-hover);
    outline-offset: -2px;
}
</style>
