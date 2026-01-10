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
      default:
        return null
    }
  })()
  console.log('获取到的值:', result)
  return result
})
