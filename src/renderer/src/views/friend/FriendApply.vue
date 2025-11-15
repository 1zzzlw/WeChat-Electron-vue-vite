<template>
  <div class="apply-count">
    <div class="apply-info">
      <div class="info-top">
        <img :src="applyInfo.avatar" alt="" class="img" />
        <h1>{{ applyInfo.username }}</h1>
      </div>
      <div class="info-mid">
        <div class="title">好友留言</div>
        <p>{{ applyInfo.applyMsg }}</p>
      </div>
      <div class="info-bottom">
        <div class="btn-group" v-if="applyInfo.isDealt == 0">
          <el-button type="success" @click="agreeButton">同意</el-button>
          <el-button type="danger" @click="refuseButton">拒绝</el-button>
        </div>
        <div class="btn-group" v-else-if="applyInfo.isDealt == 1">
          <el-button type="success" disabled v-if="applyInfo.dealResult == 1">已同意</el-button>
          <el-button type="danger" disabled v-else-if="applyInfo.dealResult == 0">已拒绝</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { userApplyListInfo } from '../../stores/UserApplyListStore'
import { userListInfo } from '../../stores/UserListStore'
import { dealApplyApi } from '../../api/Apply'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userApplyStore = userApplyListInfo()
const userListStore = userListInfo()
const applyInfo = reactive({
  applyId: null,
  fromUserId: null,
  username: '',
  avatar: '',
  applyMsg: '',
  isDealt: null,
  dealResult: null
})

const agreeButton = () => {
  dealApplyApi(applyInfo.applyId, 1, applyInfo.fromUserId).then((res) => {
    if (res.code === 1) {
      ElMessage.success('同意成功')
      applyInfo.isDealt = 1
      applyInfo.dealResult = 1
      userApplyStore.updateUserApplyMap(applyInfo.applyId, {
        isDealt: 1,
        dealResult: 1
      })
      userListStore.setUserMap(applyInfo.fromUserId, {
        id: applyInfo.fromUserId,
        username: applyInfo.username,
        avatar: applyInfo.avatar,
        remark: ''
      })
    } else {
      ElMessage.error('同意失败')
    }
  })
}

const refuseButton = () => {
  dealApplyApi(applyInfo.applyId, 0, applyInfo.fromUserId).then((res) => {
    if (res.code === 1) {
      ElMessage.success('拒绝成功')
      applyInfo.isDealt = 1
      applyInfo.dealResult = 0
      userApplyStore.updateUserApplyMap(applyInfo.applyId, {
        isDealt: 1,
        dealResult: 0
      })
    } else {
      ElMessage.error('拒绝失败')
    }
  })
}

watch(
  // 第一个参数：要监听的“源”（可以是响应式变量、计算属性、路由参数等）
  () => route.query.applyId,
  // 变化时执行的回调函数（newVal是新值，oldVal是旧值）
  (newVal, oldVal) => {
    applyInfo.applyId = newVal
    Object.assign(applyInfo, userApplyStore.getUserApplyMap(applyInfo.applyId))
    console.log(applyInfo)
  },
  // 初始化时也执行一次回调函数，可以替代 onMounted 钩子
  { immediate: true }
)

// onMounted(() => {
//   applyInfo.applyId = route.query.applyId
// })
</script>

<style scoped>
.apply-count {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  -webkit-app-region: no-drag;
}

.apply-info {
  width: 660px;
  height: 580px;
  border-radius: 15px;
  box-shadow: 0 0 100px white;
  background-color: seagreen;
  transition: all 0.5s;
}

.apply-info:hover {
  transform: scale(1.05);
}

.info-top {
  width: 100%;
  height: 150px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 40px;
  gap: 20px;
  border-bottom: 1px solid white;
}

.img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

.info-mid {
  width: 100%;
  height: 200px;
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid white;
}

.title {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 20px;
  font-weight: bold;
  color: white;
  padding: 10px;
}

.info-bottom {
  width: 100%;
  height: 230px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn-group {
  width: 400px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.el-button {
  width: 50%;
}
</style>
