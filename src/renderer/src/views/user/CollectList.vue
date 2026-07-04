<template>
    <div class="collect-list">
        <div class="collect-list-left">
            <div class="collect-top">
                <AutocompleteSearch />
            </div>
            <div class="collect-mid">
                <el-button @click="createNote">新建笔记</el-button>
                <router-link to="/allCollectView">
                    <div class="all-collect-item">
                        <span class=""> 全部收藏 </span>
                    </div>
                </router-link>
                <router-link to="/note">
                    <div class="all-collect-item">
                        <span class=""> 笔记 </span>
                    </div>
                </router-link>
            </div>
            <div class="collect-bottom">
                <el-collapse :expand-icon-position="'left'">
                    <el-collapse-item title="标签">
                        <div class="left-list"></div>
                    </el-collapse-item>
                </el-collapse>
            </div>
        </div>
        <div class="collect-list-right">
            <router-view></router-view>
        </div>
    </div>
</template>
<script setup lang="ts">
import AutocompleteSearch from '@/components/AutocompleteSearch.vue';

const createNote = () => {
    (window as any).windowToolApi.createNewWindow('createNote')
}
</script>
<style scoped>
@import "@/css/layout.css";

.collect-mid {
    border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
    padding-bottom: 16px;
    margin-bottom: 16px;
    padding-top: 10px;
}

.collect-mid .el-button {
    width: calc(100% - 24px);
    margin: 0 12px 16px 12px;
    /* 保持原有质感 */
    background-color: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #ffffff;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    --el-button-hover-bg-color: rgba(255, 255, 255, 0.15);
    --el-button-active-bg-color: rgba(255, 255, 255, 0.2);
}

.collect-mid .el-button:hover {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
}

.collect-mid .el-button:active {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    transform: translateY(0);
}

.collect-mid .el-button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.all-collect-item {
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    margin-bottom: 4px;
}

.all-collect-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.all-collect-item span {
    font-size: 14px;
    color: #e0e0e0;
}

:deep(.el-collapse) {
    background-color: transparent;
    border: none;
}

:deep(.el-collapse-item__header),
:deep(.el-collapse-item__wrap),
:deep(.el-collapse-item__content) {
    padding: 0;
    background-color: transparent;
    border: none;
}

:deep(.el-collapse-item__header) {
    color: #ffffff;
}

.collect-list-right {
    flex: 1;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
</style>