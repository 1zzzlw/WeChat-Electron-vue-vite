<template>
    <div class="collect-list">
        <div class="collect-list-left">
            <div class="collect-top">
                <AutocompleteSearch />
            </div>
            <div class="collect-mid">
                <el-button>新建笔记</el-button>
                <div class="all-collect-item">
                    <span class=""> 全部收藏 </span>
                </div>
                <div class="all-collect-item">
                    <span class=""> 笔记 </span>
                </div>
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
import { CollapseModelValue } from 'element-plus'

const handleChange = (val: CollapseModelValue) => {
    console.info(val)
}

</script>
<style scoped>
@import "../../css/layout.css";

.collect-mid {
    border-bottom: 1px solid black;
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
</style>