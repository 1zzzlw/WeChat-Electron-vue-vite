import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/Login.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/register/Register.vue')
    },
    {
      path: '/pendingLogin',
      name: 'pendingLogin',
      component: () => import('../views/pendingLogin/PendingLogin.vue')
    },
    {
      path: '/registerUserInfo',
      name: 'registerUserInfo',
      component: () => import('../views/register/RegisterUserInfo.vue')
    },
    {
      path: '/uploadAvatar',
      name: 'uploadAvatar',
      component: () => import('../views/register/UploadAvatar.vue')
    },
    {
      path: '/friendAdd',
      name: 'friendAdd',
      component: () => import('../views/user/UserFriendAdd.vue')
    },
    {
      path: '/createGroup',
      name: 'createGroup',
      component: () => import('../views/user/UserCreateGroup.vue')
    },
    {
      path: '/createNote',
      name: 'createNote',
      component: () => import('../views/collect/CreateNote.vue')
    },
    {
      path: '/createMomentView',
      name: 'createMomentView',
      component: () => import('../views/moments/CreateMoment.vue')
    },
    {
      path: '/MomentInfoView',
      name: 'MomentInfoView',
      component: () => import('../views/moments/MomentInfo.vue')
    },
    {
      path: '/updateMomentView',
      name: 'updateMomentView',
      component: () => import('../views/moments/UpdateMoment.vue')
    },
    {
      path: '/setting',
      name: 'setting',
      component: () => import('../views/setting/SetUserInfo.vue'),
      children: [
        {
          path: '/account',
          name: 'account',
          component: () => import('../views/setting/Account.vue')
        },
        {
          path: '/storeLocation',
          name: 'storeLocation',
          component: () => import('../views/setting/StoreLocation.vue')
        },
        {
          path: '/shortcutKey',
          name: 'shortcutKey',
          component: () => import('../views/setting/ShortcutKey.vue')
        },
        {
          path: '/informSet',
          name: 'informSet',
          component: () => import('../views/setting/InformSet.vue')
        },
        {
          path: '/about',
          name: 'about',
          component: () => import('../views/setting/About.vue')
        }
      ]
    },
    {
      path: '/imagePreview',
      name: 'imagePreview',
      component: () => import('../views/media/imagePreview.vue')
    },
    {
      path: '/videoPreview',
      name: 'videoPreview',
      component: () => import('../views/media/videoPreview.vue')
    },
    {
      path: '/standaloneChat',
      name: 'standaloneChat',
      component: () => import('../views/chat/StandaloneChat.vue')
    },
    {
      path: '/main',
      name: 'layout',
      redirect: '/messageList',
      component: () => import('../views/layout/Main.vue'),
      children: [
        {
          path: '/list',
          name: 'userList',
          component: () => import('../views/user/UserList.vue'),
          children: [
            {
              path: '/friendApply',
              name: 'friendApply',
              component: () => import('../views/friend/FriendApply.vue')
            },
            {
              path: '/friendInfo',
              name: 'friendInfo',
              component: () => import('../views/friend/FriendInfo.vue')
            },
            {
              path: '/groupApply',
              name: 'groupApply',
              component: () => import('../views/group/GroupApply.vue')
            },
            {
              path: '/groupInfo',
              name: 'groupInfo',
              component: () => import('../views/group/GroupInfo.vue')
            }
          ]
        },
        {
          path: '/messageList',
          name: 'messageList',
          component: () => import('../views/user/UserConversationList.vue'),
          children: [
            {
              path: '/chat',
              name: 'chat',
              component: () => import('../views/chat/Chat.vue')
            },
            {
              path: '/aiChat',
              name: 'aiChat',
              component: () => import('../views/chat/Ai-chat.vue')
            }
          ]
        },
        {
          path: '/collectList',
          name: 'collectList',
          component: () => import('../views/user/CollectList.vue'),
          children: [
            {
              path: '/allCollectView',
              name: 'allCollectView',
              component: () => import('../views/collect/AllCollect.vue')
            },
            {
              path: '/note',
              name: 'note',
              component: () => import('../views/collect/Note.vue')
            }
          ]
        },
        {
          path: '/moments',
          name: 'moments',
          component: () => import('../views/moments/Moments.vue')
        },
        {
          path: '/myPosts',
          name: 'myPosts',
          component: () => import('../views/moments/MyPosts.vue')
        },
        {
          path: '/wallet',
          name: 'wallet',
          component: () => import('../views/wallet/wallet.vue')
        }
      ]
    }
  ]
})

// 无需鉴权的白名单路由
const authWhitelist = ['/login', '/register', '/registerUserInfo', '/uploadAvatar']

// 子窗口路由白名单（通过 IPC 获取数据，不走 token 鉴权）
const childWindowWhitelist = [
  '/friendAdd',
  '/createGroup',
  '/createNote',
  '/createMomentView',
  '/updateMomentView',
  '/MomentInfoView',
  '/setting',
  '/imagePreview',
  '/videoPreview',
  '/standaloneChat'
]

// 全局前置守卫：处理所有路由跳转的权限判断
router.beforeEach(async (to, from, next) => {
  // 白名单路由直接放行
  if (authWhitelist.includes(to.path)) {
    next()
    return
  }

  // 子窗口路由白名单直接放行（通过 IPC 传递数据）
  if (childWindowWhitelist.includes(to.path)) {
    next()
    return
  }

  // 获取 token（调用主进程的 IPC 接口）
  const token = await window.userInfoApi.storeGetUserInfo('token')

  // 根路径 '/'：根据 token 动态跳转
  if (to.path === '/') {
    if (token) {
      next('/pendingLogin')
    } else {
      next('/login')
    }
    return
  }

  // /main 下的受保护路由：检查 token 是否存在
  if (to.path.startsWith('/main') || to.matched.some((record) => record.path.startsWith('/main'))) {
    if (!token) {
      next('/login')
      return
    }
  }

  // 其他情况放行
  next()
})

export default router
