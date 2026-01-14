<template>
  <div class="user-online-status">
    <div class="green-dot"></div>
  </div>
</template>

<script setup></script>

<style scoped>
.user-online-status {
  position: absolute;
  top: 58px;
  left: 58px;
}

.green-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #4caf50;
}

.green-dot:hover {
  transform: scale(1.3);
  opacity: 0.9;
  transition: all 0.2s ease;
}

.green-dot::after {
  content: '在线';
  font-size: 10px;
  position: absolute;
  /* 提示文字在徽章上方 */
  top: 8px;
  left: -10px;
  color: #fff;
  padding: 4px 8px;
  /* 让文字横着显示的2个关键样式 */
  white-space: nowrap;
  /* 让元素宽度自适应文字，不挤压 */
  display: inline-block;
  /* 默认隐藏 */
  opacity: 0;
}

.green-dot:hover::after {
  /* 鼠标悬停时显示 */
  opacity: 1;
  transition: all 0.2s ease;
}
</style>
