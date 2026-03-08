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
import { ref } from 'vue';
import AutocompleteSearch from '../../components/AutocompleteSearch.vue';

const createNote = () => {
    (window as any).windowToolApi.createNewWindow('createNote')
}

</script>
<style scoped>
@import "../../css/layout.css";

.collect-mid {
    border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
    padding-bottom: 12px;
    margin-bottom: 12px;
}

.collect-mid .el-button {
    width: 100%;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
}

.collect-mid .el-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
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
    -webkit-app-region: drag;
}
</style>