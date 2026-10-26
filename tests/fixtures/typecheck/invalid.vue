<script setup lang="ts">
// 预期报错：同时验证 Vue 的脚本和模板类型检查。
const count: number = 'not a number'
</script>

<template>{{ count.missingQualityProperty }}</template>
