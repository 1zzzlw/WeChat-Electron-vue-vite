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
                <div class="left-list" v-for="(apply, index) in groupApplyListArr" :key="index"
                  :class="{ 'left-groupApplyList-bg': activeGroupApply == apply.conversationId }"
                  @click="startGroupApply(apply)">
                  <div class="left-image">
                    <img :src="apply.userAvatar + '?t=' + Date.now()" alt="头像" class="left-list-img" />
                  </div>
                  <div class="friend-name">{{ apply.groupName }}</div>
                </div>
              </el-collapse-item>
              <el-collapse-item title="群聊" name="3">
                <div class="left-list" v-for="(group, index) in groupListArr" :key="index"
                  :class="{ 'left-list-bg': activeGroup == group.id }" @click="startGroupInfo(group)">
                  <div class="left-image">
                    <img :src="group.avatar + '?t=' + Date.now()" alt="头像" class="left-list-img" />
                  </div>
                  <div class="friend-name">{{ group.name || group.remark }}</div>
                </div>
              </el-collapse-item>
              <el-collapse-item title="联系人" name="4">
                <div class="left-list" v-for="friend in friendListArr" :key="friend.friendId"
                  :class="{ 'left-friendList-bg': activeFriend == friend.friendId }" @click="starCall(friend)">
                  <div class="left-image">
                    <img :src="friend.avatar" alt="头像" class="left-list-img"
                      :class="{ 'user-offline': !friend.isOnline }" />
                  </div>
                  <div>
                    <h1 class="friend-name">{{ friend.username }}
                    </h1>
                    <div v-show="friend.isOnline" class="online-status">在线</div>
                    <div v-show="!friend.isOnline" class="offline-status">离线</div>
                  </div>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getApplyListApi, getGroupApplyListApi } from '../../api/Apply'
import { CollapseModelValue } from 'element-plus'
import { userApplyListInfo } from '../../stores/modules/UserApplyListStore'
import { friendInfo } from '../../stores/modules/ContactListStore'
import { conversationInfo } from '../../stores/modules/ConversationStore'
import AutocompleteSearch from '../../components/AutocompleteSearch.vue'

const userId = ref()
const userApplyStore = userApplyListInfo()
const friendInfoStore = friendInfo()
const conversationStore = conversationInfo()
// 联系人列表默认展开
const activeNames = ref(['4'])
const handleChange = (val: CollapseModelValue) => {
}

const router = useRouter()
const activeApply = ref('')
const activeGroupApply = ref('')
const activeGroup = ref('')
const activeFriend = ref()

const startApply = (activeApply: any) => {
  router.push({ path: '/friendApply', query: { applyId: activeApply.applyId } })
}

const startGroupApply = (activeApply: any) => {
  activeGroupApply.value = activeApply.id
  router.push({ path: '/groupApply', query: { applyId: activeApply.id } })
}

const startGroupInfo = (group: any) => {
  activeGroup.value = group.id
  router.push({ path: '/groupInfo', query: { conversationId: group.id } })
}

const starCall = (user: any) => {
  activeFriend.value = user.friendId
  router.push({ path: '/friendInfo', query: { friendId: user.friendId } })
}

const fetchApplyList = () => {
  const cache = Object.keys(userApplyStore.userApplyMap).length > 0
  if (cache) {
    // 有缓存时，停止钩子函数的查询，防止接口的频繁发送
    return
  }

  // 没有缓存时，从后端获取好友申请列表
  getApplyListApi().then((res) => {
    res.data.forEach((applyItem: any) => {
      userApplyStore.setUserApplyMap(applyItem.applyId, {
        applyId: applyItem.applyId,
        fromUserId: applyItem.fromUserId,
        username: applyItem.username,
        avatar: applyItem.avatar,
        account: applyItem.account,
        gender: applyItem.gender,
        phone: applyItem.phone,
        email: applyItem.email,
        birthday: applyItem.birthday,
        address: applyItem.address,
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
    return
  }

  getGroupApplyListApi().then((res) => {
    res.data.forEach((applyItem: any) => {
      userApplyStore.setGroupApplyMap(applyItem.id, {
        id: applyItem.id,
        conversationId: applyItem.conversationId,
        userId: applyItem.userId,
        userAvatar: applyItem.userAvatar,
        groupName: applyItem.groupName,
        status: applyItem.status
      })
    })
  })
}

const groupListArr = computed(() =>
  conversationStore.getGroupConversationList()
)

const groupApplyListArr = computed(() => Object.values(userApplyStore.groupApplyMap))

const friendListArr = computed(() => Object.values(friendInfoStore.friendInfoMap))

const friendApplyListArr = computed(() => {
  return userApplyStore.getAllUserApplyMap()
})


onMounted(async () => {
  userId.value = await (window as any).userInfoApi.storeGetUserInfo('userId')

  fetchGroupApplyList()

  fetchApplyList()
})
</script>

<style scoped>
@import "../../css/layout.css";

.online-status {
  color: rgba(102, 217, 102, 0.9);
  font-weight: 500;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.online-status::before {
  content: '';
  background-color: rgba(102, 217, 102, 0.95);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  box-shadow: 0 0 4px rgba(102, 217, 102, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.offline-status {
  color: rgba(150, 150, 150, 0.9);
  font-weight: 500;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.offline-status::before {
  content: '';
  background-color: rgba(150, 150, 150, 0.95);
  border-radius: 50%;
  width: 10px;
  height: 10px;
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  border: 1px solid rgba(255, 255, 255, 0.3);
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

.user-offline {
  filter: grayscale(100%);
  transition: filter 0.8s ease;
}

.user-list-right {
  flex: 1;
  -webkit-app-region: drag;
}
</style>
