<template>
  <el-autocomplete
    popper-style="width: 400px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);"
    v-model="searchInput"
    :fetch-suggestions="querySearch"
    placeholder="搜索"
    :prefix-icon="Search"
    @select="handleSelect"
    :debounce="500"
    spellcheck="false"
    clearable
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'

interface RestaurantItem {
  value: string
  link: string
}

const restaurants = ref<RestaurantItem[]>([])
const searchInput = ref('')

const querySearch = (queryString: string, cb: any) => {
  let results
  if (queryString) {
    // 情况1：用户有输入（输入框不是空的）
    results = restaurants.value.filter(createFilter(queryString))
  } else {
    // 情况2：用户没输入（输入框是空的）
    results = restaurants.value
  }
  // 调用回调函数，返回建议信息
  cb(results)
}

const handleSelect = (item: RestaurantItem) => {
  window.open(item.link)
}

// 忽略大小写并且设置开头匹配
const createFilter = (queryString: string) => {
  return (restaurant: RestaurantItem) => {
    return restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
  }
}

onMounted(() => {
  // 模拟从后端获取数据
  restaurants.value = [
    { value: '餐厅A', link: 'https://www.baidu.com' },
    { value: '餐厅B', link: 'https://www.taobao.com' },
    { value: '餐厅C', link: 'https://www.jd.com' },
    { value: '餐厅D', link: 'https://www.1688.com' },
    { value: '餐厅E', link: 'https://www.58.com' }
  ]
})
</script>
