<template>
    <div class="time-count">
        <div class="time">
            {{ formatMessageTime(props.dataTime) }}
        </div>
    </div>
</template>
<script setup lang="ts">
import { formatMessageTime } from '@/utils/utils'

const props = defineProps({
    dataTime: String
})
</script>
<style scoped>
.time-count {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    margin: 8px 0;
}

.time {
    padding: 4px 10px;
    font-size: 12px;
    color: #ffffff;
    background-color: rgba(120, 120, 120, 0.35);
    border-radius: 12px;
    white-space: nowrap;
    backdrop-filter: blur(4px);
}
</style>