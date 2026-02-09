<template>
  <div class="window-controls">
    <div v-if="showSetTop" :class="isTop ? 'iconfont icon-quxiaozhiding' : 'iconfont icon-top'" @click="setTop"
      :title="isTop ? '取消置顶' : '置顶'"></div>
    <div class="iconfont icon-minus" v-if="showSetMiniSize" @click="miniWindow"></div>
    <div v-if="showSetFullScreen"
      :class="isFullScreen ? 'iconfont icon-fullscreen-shrink' : 'iconfont icon-fullscreen-expand'"
      @click="changeScreen"></div>
    <div class="iconfont icon-close" @click="closeWindow"></div>
  </div>
</template>

<script setup>
import '../assets/iconfont/iconfont.css'
import { ref } from 'vue'

let isTop = ref(false)
let isFullScreen = ref(false)

const props = defineProps({
  showSetTop: {
    type: Boolean,
    default: true
  },
  showSetMiniSize: {
    type: Boolean,
    default: true
  },
  showSetFullScreen: {
    type: Boolean,
    default: true
  },
  windowType: {
    type: String,
    default: ''
  }
})

const setTop = () => {
  isTop.value = !isTop.value
  window.windowToolApi.windowControls(props.windowType, 'setTop', isTop.value)
}

const miniWindow = () => {
  window.windowToolApi.windowControls(props.windowType, 'miniWindow')
}

const changeScreen = () => {
  isFullScreen.value = !isFullScreen.value
  window.windowToolApi.windowControls(props.windowType, 'changeScreen', isFullScreen.value)
}

const closeWindow = () => {
  window.windowToolApi.windowControls(props.windowType, 'closeWindow')
}
</script>

<style scoped>
.window-controls {
  display: flex;
  position: absolute;
  top: 10px;
  right: 10px;
  -webkit-app-region: no-drag;
  z-index: 999;
}

.iconfont {
  font-size: 18px;
  margin-left: 5px;
  margin-right: 5px;
  transition: all 0.2s ease;
}

.iconfont:hover {
  transform: scale(1.3);
  opacity: 0.9;
  transition: all 0.2s ease;
}
</style>
