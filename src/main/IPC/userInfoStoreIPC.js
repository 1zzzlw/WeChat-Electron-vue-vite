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
  switch (userInfoType) {
    case 'token':
      return store.get('token')
    case 'avatar':
      return store.get('avatar')
    case 'userId':
      return store.get('userId')
    case 'storeLocation':
      return store.get('storeLocation')
  }
})
