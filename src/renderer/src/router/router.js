import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

import LoginView from '../views/login/Login.vue'
import RegisterView from '../views/register/Register.vue'
import PendingLogin from '../views/pendingLogin/PendingLogin.vue'
import RegisterUserInfoView from '../views/register/RegisterUserInfo.vue'
import UploadAvatarView from '../views/register/uploadAvatar.vue'
import LayoutView from '../views/layout/Main.vue'
import UserConversationListView from '../views/user/UserConversationList.vue'
import UserListView from '../views/user/UserList.vue'
import CollectList from '../views/user/CollectList.vue'
import AllCollectView from '../views/collect/AllCollect.vue'
import NoteView from '../views/collect/Note.vue'
import ChatView from '../views/chat/Chat.vue'
import AiChatView from '../views/chat/Ai-chat.vue'
import FriendAddView from '../views/user/UserFriendAdd.vue'
import FriendApplyView from '../views/friend/FriendApply.vue'
import FriendInfoView from '../views/friend/FriendInfo.vue'
import CreateGroupView from '../views/user/UserCreateGroup.vue'
import MomentsView from '../views/moments/Moments.vue'
import SetUserInfoView from '../views/setting/SetUserInfo.vue'
import AccountVue from '../views/setting/Account.vue'
import StoreLocationView from '../views/setting/StoreLocation.vue'
import ShortcutKeyVue from '../views/setting/ShortcutKey.vue'
import InformSetVue from '../views/setting/InformSet.vue'
import AboutVue from '../views/setting/About.vue'
import ImagePreviewView from '../views/media/imagePreview.vue'
import VideoPreviewView from '../views/media/videoPreview.vue'
import CreateNoteView from '../views/collect/CreateNote.vue'
import groupApplyView from '../views/group/groupApply.vue'
import groupInfoView from '../views/group/groupInfo.vue'


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
      path: '/createNote',
      name: 'createNote',
      component: CreateNoteView
    },
    {
      path: '/setting',
      name: 'setting',
      component: SetUserInfoView,
      children: [
        {
          path: '/account',
          name: 'account',
          component: AccountVue
        },
        {
          path: '/storeLocation',
          name: 'storeLocation',
          component: StoreLocationView
        },
        {
          path: '/shortcutKey',
          name: 'shortcutKey',
          component: ShortcutKeyVue
        },
        {
          path: '/informSet',
          name: 'informSet',
          component: InformSetVue
        },
        {
          path: '/about',
          name: 'about',
          component: AboutVue
        }
      ]
    },
    {
      path: '/imagePreview',
      name: 'imagePreview',
      component: ImagePreviewView
    },
    {
      path: '/videoPreview',
      name: 'videoPreview',
      component: VideoPreviewView
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
            },
            {
              path: '/groupApply',
              name: 'groupApply',
              component: groupApplyView
            },
            {
              path: '/groupInfo',
              name: 'groupInfo',
              component: groupInfoView
            }
          ]
        },
        {
          path: '/messageList',
          name: 'messageList',
          component: UserConversationListView,
          children: [
            {
              path: '/chat',
              name: 'chat',
              component: ChatView
            },
            {
              path: '/aiChat',
              name: 'aiChat',
              component: AiChatView
            }
          ]
        },
        {
          path: '/collectList',
          name: 'collectList',
          component: CollectList,
          children: [
            {
              path: '/allCollectView',
              name: 'allCollectView',
              component: AllCollectView
            },
            {
              path: '/note',
              name: 'note',
              component: NoteView
            }
          ]
        },
        {
          path: '/moments',
          name: 'moments',
          component: MomentsView
        }
      ]
    }
  ]
})

// 全局前置守卫：处理所有路由跳转的权限判断
router.beforeEach(async (to, from, next) => {
  if (to.path === '/friendAdd' || to.path === '/createGroup') {
    next()
    return
  }

  // 1. 获取token（调用主进程的IPC接口）
  const token = await window.userInfoApi.storeGetUserInfo('token')

  // 2. 根路径 '/'：根据token动态跳转
  if (to.path === '/') {
    console.log(123)
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
