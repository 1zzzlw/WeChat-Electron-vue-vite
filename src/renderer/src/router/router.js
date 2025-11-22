import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

import LoginView from '../views/login/Login.vue'
import RegisterView from '../views/register/Register.vue'
import PendingLogin from '../views/pendingLogin/PendingLogin.vue'
import RegisterUserInfoView from '../views/register/RegisterUserInfo.vue'
import UploadAvatarView from '../views/register/uploadAvatar.vue'
import LayoutView from '../views/layout/Main.vue'
import UserMessageListView from '../views/user/UserMessageList.vue'
import UserListView from '../views/user/UserList.vue'
import CollectView from '../views/collect/Collect.vue'
import ChatView from '../views/chat/Chat.vue'
import FriendAddView from '../views/user/UserFriendAdd.vue'
import FriendApplyView from '../views/friend/FriendApply.vue'
import FriendInfoView from '../views/friend/FriendInfo.vue'
import CreateGroupView from '../views/user/UserCreateGroup.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/pendingLogin',
      name: 'pendingLogin',
      component: PendingLogin
    },
    {
      path: '/registerUserInfo',
      name: 'registerUserInfo',
      component: RegisterUserInfoView
    },
    {
      path: '/uploadAvatar',
      name: 'uploadAvatar',
      component: UploadAvatarView
    },
    {
      path: '/friendAdd',
      name: 'friendAdd',
      component: FriendAddView
    },
    {
      path: '/createGroup',
      name: 'createGroup',
      component: CreateGroupView
    },
    {
      path: '/main',
      name: 'layout',
      redirect: '/messageList',
      component: LayoutView,
      children: [
        {
          path: '/list',
          name: 'userList',
          component: UserListView,
          children: [
            {
              path: '/friendApply',
              name: 'friendApply',
              component: FriendApplyView
            },
            {
              path: '/friendInfo',
              name: 'friendInfo',
              component: FriendInfoView
            }
          ]
        },
        {
          path: '/messageList',
          name: 'messageList',
          component: UserMessageListView,
          children: [
            {
              path: '/chat',
              name: 'chat',
              component: ChatView
            }
          ]
        },
        {
          path: '/collect',
          name: 'collect',
          component: CollectView
        }
      ]
    }
  ]
})

// 全局前置守卫：处理所有路由跳转的权限判断
router.beforeEach(async (to, from, next) => {
  // 1. 获取token（调用主进程的IPC接口）
  const token = await window.api.storeGetToken()

  if (to.path === '/friendAdd') {
    next()
    return
  }

  // 2. 根路径 '/'：根据token动态跳转
  if (to.path === '/') {
    if (token) {
      console.log('有登录信息，跳转待登录页')
      next('/pendingLogin') // 有token→待登录页
    } else {
      console.log('无登录信息，跳转登录页')
      next('/login') // 无token→登录页
    }
    return
  }
  // 4. 其他页面（登录、注册等）直接放行
  next()
})

export default router
