import { store } from '../index'
import { ipcMain } from 'electron'

// 存储用户信息
ipcMain.handle('window:setUserInfo', (e, userInfoType, userInfo) => {
  console.log(userInfoType)
  console.info('设置用户信息', userInfoType, userInfo)
  switch (userInfoType) {
    case 'token':
      store.set('token', userInfo)
      break
    case 'accessToken':
      store.set('accessToken', userInfo)
      break
    case 'avatar':
      store.set('avatar', userInfo)
      break
    case 'userId':
      store.set('userId', userInfo)
      break
    case 'storeLocation':
      store.set('storeLocation', userInfo)
      break
    case 'wallpaper':
      store.set('wallpaper', userInfo)
      break
    case 'wallpaperPath':
      store.set('wallpaperPath', userInfo)
      break
    case 'username':
      store.set('username', userInfo)
      break
    case 'phone':
      store.set('phone', userInfo)
      break
    case 'account':
      store.set('account', userInfo)
      break
    case 'gender':
      store.set('gender', userInfo)
      break
  }
  return true
})

// 获取用户信息
ipcMain.handle('window:getUserInfo', (e, userInfoType) => {
  console.log('获取用户信息:', userInfoType)
  const result = (() => {
    switch (userInfoType) {
      case 'token':
        return store.get('token')
      case 'accessToken':
        return store.get('accessToken')
      case 'avatar':
        return store.get('avatar')
      case 'userId':
        return store.get('userId')
      case 'storeLocation':
        return store.get('storeLocation')
      case 'wallpaper':
        return store.get('wallpaper')
      case 'wallpaperPath':
        return store.get('wallpaperPath')
      case 'username':
        return store.get('username')
      case 'phone':
        return store.get('phone')
      case 'account':
        return store.get('account')
      case 'gender':
        return store.get('gender')
      default:
        return null
    }
  })()
  console.log('获取到的值:', result)
  return result
})
