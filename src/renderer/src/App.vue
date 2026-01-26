<template>
  <!--打开调试工具-->
  <p class="tip"></p>
  <router-view></router-view>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('开启ws的监听事件')

  window.wsApi.onMessage((data) => {
    console.log(data)
  })
})

</script>
