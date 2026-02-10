<template>
    <div class="chat-header">
        <div class="title">
            {{ friendRemark || friendUsername }}
        </div>
        <div class="chat-set">
            <el-icon class="left-icon" size="25" @click="drawer = true">
                <MoreFilled />
            </el-icon>
            <el-drawer v-model="drawer" title="下载文件" class="download-drawer" :modal="false" :append-to-body="true"
                modal-penetrable>
            </el-drawer>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

// 抽屉状态
const drawer = ref(false)

const openSetting = () => {

}

const props = defineProps({
    friendRemark: String,
    friendUsername: String
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
    color: rgba(66, 153, 225, 0.9);
    text-shadow: 0 0 6px rgba(66, 153, 225, 0.3);
}
</style>