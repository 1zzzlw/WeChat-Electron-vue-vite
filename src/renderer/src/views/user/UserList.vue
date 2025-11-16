<template>
  <div class="user-list">
    <div class="user-list-left">
      <div class="list-top">
        <el-input
          style="width: 240px"
          placeholder="搜索"
          :prefix-icon="Search"
          spellcheck="false"
        />
      </div>
      <div class="list-bottom">
        <el-scrollbar>
          <div>
            <el-collapse
              :expand-icon-position="'left'"
              v-model="activeNames"
              @change="handleChange"
            >
              <el-collapse-item title="好友申请列表" name="1">
                <div
                  class="left-list"
                  v-for="(apply, index) in friendApplyListArr"
                  :key="index"
                  :class="{ 'left-list-bg': active == apply.applyId }"
                  @click="startApply(apply)"
                >
                  <div class="left-image">
                    <img :src="apply.avatar" alt="头像" class="left-list-img" />
                  </div>
                  <h1 class="friend-name">{{ apply.username }}</h1>
                </div>
              </el-collapse-item>
              <el-collapse-item title="群聊" name="2"></el-collapse-item>
              <el-collapse-item title="联系人" name="3">
                <div
                  class="left-list"
                  v-for="(user, index) in friendListArr"
                  :key="index"
                  :class="{ 'left-list-bg': active == user.id }"
                  @click="starCall(user)"
                >
                  <div class="left-image">
                    <img :src="user.avatar" alt="头像" class="left-list-img" />
                  </div>
                  <h1 class="friend-name" v-if="user.remark === ''">{{ user.username }}</h1>
                  <h1 class="friend-name" v-else>{{ user.remark }}</h1>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <div class="user-list-right">
      <router-view></router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { getFriendListApi } from '../../api/Friend'
import { getApplyListApi } from '../../api/Apply'
import { CollapseModelValue } from 'element-plus'
import { userApplyListInfo } from '../../stores/UserApplyListStore'
import { userListInfo } from '../../stores/ContactListStore'

const userApplyStore = userApplyListInfo()
const userListStore = userListInfo()
// 联系人列表默认展开
const activeNames = ref(['3'])
const handleChange = (val: CollapseModelValue) => {
  console.info(val)
  // 学习了computed之后感觉可以替代下方的代码了
  // const cache = Object.keys(userApplyStore.userApplyMap).length > 0
  // if (cache) {
  //   console.info('pinia的缓存好友申请列表:', userApplyStore.getAllUserApplyMap())
  //   friendApplyList.arr = userApplyStore.getAllUserApplyMap()
  // }
}

const router = useRouter()
const active = ref('')

const startApply = (apply) => {
  console.info(apply.applyId)
  router.push({ path: '/friendApply', query: { applyId: apply.applyId } })
}

const starCall = (user) => {
  active.value = user.id
  router.push({ path: '/friendInfo', query: { friendId: user.id } })
}

const fetchApplyList = () => {
  const cache = Object.keys(userApplyStore.userApplyMap).length > 0
  if (cache) {
    // 有缓存时，停止钩子函数的查询，防止接口的频繁发送
    console.info('好友申请表缓存非空:', cache)
    return
  }

  // 没有缓存时，从后端获取好友申请列表
  getApplyListApi().then((res) => {
    console.info('好友申请列表:', res.data)
    res.data.forEach((applyItem) => {
      userApplyStore.setUserApplyMap(applyItem.applyId, {
        applyId: applyItem.applyId,
        fromUserId: applyItem.fromUserId,
        username: applyItem.username,
        avatar: applyItem.avatar,
        applyMsg: applyItem.applyMsg,
        isDealt: applyItem.isDealt,
        dealResult: applyItem.dealResult
      })
    })
  })
}

const fetchUserList = () => {
  const cache = Object.keys(userListStore.userMap).length > 0
  if (cache) {
    console.info('好友列表缓存非空:', cache)
    return
  }

  getFriendListApi().then((res) => {
    console.info('好友列表:', res.data)
    res.data.forEach((userItem) => {
      userListStore.setUserMap(userItem.id, {
        id: userItem.id,
        username: userItem.username,
        avatar: userItem.avatar,
        remark: userItem.remark
      })
    })
  })
}

const friendListArr = computed(() => Object.values(userListStore.userMap))

const friendApplyListArr = computed(() => {
  return userApplyStore.getAllUserApplyMap()
})

onMounted(() => {
  fetchUserList()

  fetchApplyList()
})
</script>

<style scoped>
.user-list {
  display: flex;
  height: 100%;
  width: 100%;
}

.user-list-left {
  width: 200px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #91b5cf;
}

.list-top {
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 10px 10px 10px;
  gap: 5px;
  background-color: white;
}

.list-bottom {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.left-list {
  /* 固定高度确保所有项目一致 */
  height: 72px;
  /* 确保占满父容器 */
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px;
  gap: 10px;
  transition: 0.3s;
}

.friend-name {
  font-size: 16px;
  color: #ffffff;
  margin: 0;
  /*单行文本溢出显示省略号*/
  /*强制不换行*/
  white-space: nowrap;
  /*溢出部分进行隐藏*/
  overflow: hidden;
  /*文字移除的时候，显示省略号*/
  text-overflow: ellipsis;
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

.left-list:hover {
  background-color: #f5f7fa;
}

.left-list-bg {
  background-color: #f5f7fa;
}

.left-list-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  /* 防止头像被压缩 */
  flex-shrink: 0;
}

.user-list-right {
  flex: 1;
  background-color: aqua;
  -webkit-app-region: drag;
}
</style>
