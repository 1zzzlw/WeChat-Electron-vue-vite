<template>
  <div class="user-list">
    <div class="user-list-left">
      <div class="list-top">
        <AutocompleteSearch />
      </div>
      <div class="list-bottom">
        <el-scrollbar>
          <div>
            <el-collapse :expand-icon-position="'left'" v-model="activeNames" @change="handleChange">
              <el-collapse-item title="好友申请列表" name="1">
                <div class="left-list" v-for="apply in friendApplyListArr" :key="apply.applyId"
                  :class="{ 'left-applyList-bg': activeApply == apply.applyId }" @click="startApply(apply)">
                  <div class="left-image">
                    <img :src="apply.avatar" alt="头像" class="left-list-img" />
                  </div>
                  <h1 class="friend-name">{{ apply.username }}</h1>
                </div>
              </el-collapse-item>
              <el-collapse-item title="群聊申请" name="2">
                <div class="left-list-group" v-for="(apply, index) in groupApplyListArr" :key="index"
                  :class="{ 'left-groupApplyList-bg': activeGroupApply == apply.id }">
                  <div class="left-image">
                    <img :src="apply.userAvatar" alt="头像" class="left-list-img" />
                  </div>
                  <div class="friend-name">{{ apply.groupName }}</div>
                  <div class="btn1" v-if="apply.status === 1">
                    <el-button type="primary" size="small" @click="joinGroup(apply)">入群</el-button>
                    <el-button type="danger" size="small" @click="ignoreGroupApply(apply)">忽略</el-button>
                  </div>
                  <div v-else-if="apply.status === 2">
                    <el-button type="primary" size="small" disabled>已入群</el-button>
                  </div>
                  <div v-else>
                    <el-button type="danger" size="small" disabled>已忽略</el-button>
                  </div>
                </div>
              </el-collapse-item>
              <el-collapse-item title="群聊" name="3">
                <div class="left-list-group" v-for="(group, index) in groupListArr" :key="index"
                  :class="{ 'left-list-bg': activeGroup == group.id }">
                  <div class="left-image">
                    <img :src="group.groupAvatar" alt="头像" class="left-list-img" />
                  </div>
                  <div class="friend-name">{{ group.groupName }}</div>
                </div>
              </el-collapse-item>
              <el-collapse-item title="联系人" name="4">
                <div class="left-list" v-for="friend in friendListArr" :key="friend.friendId"
                  :class="{ 'left-friendList-bg': activeFriend == friend.friendId }" @click="starCall(friend)">
                  <div class="left-image">
                    <img :src="friend.avatar" alt="头像" class="left-list-img" />
                  </div>
                  <h1 class="friend-name" v-if="friend.remark === ''">{{ friend.username }}</h1>
                  <h1 class="friend-name" v-else>{{ friend.remark }}</h1>
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
import { getFriendListApi } from '../../api/Friend'
import { getApplyListApi, getGroupApplyListApi, dealGroupApplyApi } from '../../api/Apply'
import { Friend } from '../../types/friend'
import { getFriendList } from '../../db/dualDB'
import { CollapseModelValue, ElMessage } from 'element-plus'
import { userApplyListInfo } from '../../stores/UserApplyListStore'
import { friendInfo } from '../../stores/ContactListStore'
import { groupListInfo } from '../../stores/GroupListStores'
import { groupMemberInfo } from '../../stores/GroupMemberStores'
import AutocompleteSearch from '../../components/AutocompleteSearch.vue'

const userId = ref()
const userApplyStore = userApplyListInfo()
const friendInfoStore = friendInfo()
const groupListStore = groupListInfo()
const groupMemberStore = groupMemberInfo()
// 联系人列表默认展开
const activeNames = ref(['4'])
const handleChange = (val: CollapseModelValue) => {
  console.info(val)
}

const router = useRouter()
const activeApply = ref('')
const activeGroupApply = ref('')
const activeGroup = ref('')
const activeFriend = ref()

const startApply = (activeApply: any) => {
  console.info(activeApply.applyId)
  router.push({ path: '/friendApply', query: { applyId: activeApply.applyId } })
}

const starCall = (user: any) => {
  console.info('用户', user.id, '点击了联系人')
  activeFriend.value = user.id
  router.push({ path: '/friendInfo', query: { friendId: user.id } })
}

const joinGroup = async (activeGroupApply: any) => {
  console.info(activeGroupApply)
  const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
  console.info('用户', userId, '同意入群:')
  dealGroupApplyApi(activeGroupApply.conversationId, activeGroupApply.userId, userId, 2).then((res: any) => {
    if (res.code === 1) {
      ElMessage.success('入群成功')
      userApplyStore.updateGroupApplyStatus(activeGroupApply.userId, 2)
      groupMemberStore.addGroupMember(activeGroupApply.conversationId, {
        conversationId: activeGroupApply.conversationId,
        userId: activeGroupApply.userId,
        username: activeGroupApply.username,
        role: 0,
        avatar: activeGroupApply.avatar
      })
    } else {
      ElMessage.error('入群失败')
    }
  })
}

const ignoreGroupApply = async (apply: any) => {
  console.info(apply)
  const userId = await (window as any).userInfoApi.storeGetUserInfo('userId')
  console.info('用户', userId, '忽略入群:')
  dealGroupApplyApi(apply.conversationId, apply.userId, userId, 3).then((res: any) => {
    if (res.code === 1) {
      ElMessage.success('忽略入群成功')
      userApplyStore.updateGroupApplyStatus(apply.userId, 3)
    } else {
      ElMessage.error('忽略入群失败')
    }
  })
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
    res.data.forEach((applyItem: any) => {
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

const fetchGroupApplyList = () => {
  const cache = Object.keys(userApplyStore.groupApplyMap).length > 0
  if (cache) {
    console.info('群聊申请列表缓存非空:', cache)
    return
  }

  getGroupApplyListApi().then((res) => {
    console.info('群聊申请列表:', res.data)
    res.data.forEach((applyItem: any) => {
      userApplyStore.setGroupApplyMap(applyItem.userId, {
        conversationId: applyItem.conversationId,
        userId: applyItem.userId,
        userAvatar: applyItem.userAvatar,
        groupName: applyItem.groupName,
        status: applyItem.status
      })
    })
  })
}

const fetchGroupList = () => {
  const cache = Object.keys(groupListStore.groupListMap).length > 0

  if (cache) {
    console.info('群聊列表缓存非空:', cache)
    return
  }

  // getGroupListApi().then((res) => {
  //   console.info('群聊列表:', res.data)
  //   res.data.forEach((groupItem) => {
  //     groupListStore.setGroupListMap(groupItem.id, {
  //       id: groupItem.id,
  //       groupName: groupItem.groupName,
  //       groupAvatar: groupItem.groupAvatar,
  //       ownerId: groupItem.ownerId,
  //       isTop: groupItem.isTop,
  //       latestMsg: groupItem.latestMsg,
  //       latestMsgTime: groupItem.latestMsgTime,
  //       status: groupItem.status
  //     })
  //   })
  // })
}

const groupListArr = computed(() => Object.values(groupListStore.groupListMap))

const groupApplyListArr = computed(() => Object.values(userApplyStore.groupApplyMap))

const friendListArr = computed(() => Object.values(friendInfoStore.friendInfoMap))

const friendApplyListArr = computed(() => {
  return userApplyStore.getAllUserApplyMap()
})

const loadFriendList = async () => {
  const cache = friendInfoStore.initCache(userId.value as string)

  if (!cache) {
    // 缓存失效，重新获取
    console.info('好友信息缓存为空或缓存失效')

    const friendList = await getFriendList()
    friendList.forEach((friendInfo: Friend) => {
      friendInfoStore.setFriendMap(friendInfo.friendId, friendInfo)
    })
  }
}

onMounted(async () => {
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')

  fetchGroupApplyList()
  fetchGroupList()
  fetchApplyList()

  loadFriendList()

})
</script>

<style scoped>
@import "../../css/layout.css";

.left-list-group {
  /* 固定高度确保所有项目一致 */
  height: 72px;
  /* 确保占满父容器 */
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  gap: 10px;
  transition: 0.3s;
}

.btn1 {
  display: flex;
  margin: 0;
  padding: 0;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

.btn1 button {
  width: 40px;
  height: 20px;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
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

.left-list-img {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  /* 防止头像被压缩 */
  flex-shrink: 0;
}

.user-list-right {
  flex: 1;
  -webkit-app-region: drag;
}
</style>
