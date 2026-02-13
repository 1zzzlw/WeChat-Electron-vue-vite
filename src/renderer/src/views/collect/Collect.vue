<template>
  <ContextMenu :menu="[
    { label: '菜单1' },
    { label: '菜单2' },
    { label: '菜单3' },
    { label: '菜单4' },
  ]" @select="handleChoice">
    <div class="content">收藏</div>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ContextMenu from '../../components/ContextMenu.vue';

const handleChoice = (item: string) => {
  console.log(item)
}

</script>

<style scoped>
.content {
  width: 100%;
  height: 100%;
}
</style>
