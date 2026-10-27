import { store } from '../shared.js'
import { ipcMain, safeStorage } from 'electron'

const MODEL_API_KEYS_STORE_KEY = 'modelApiKeys'

const getModelApiKeyIdentity = (modelConfig) => {
  const userId = String(modelConfig?.userId ?? '').trim()
  const configId = String(modelConfig?.configId ?? '').trim()

  if (!userId || !configId) {
    throw new Error('模型 API Key 操作缺少 userId 或 configId')
  }

  return { userId, configId }
}

const setModelApiKey = (modelConfig) => {
  const { userId, configId } = getModelApiKeyIdentity(modelConfig)
  const apiKey = String(modelConfig?.apiKey ?? '').trim()
  const modelApiKeys = store.get(MODEL_API_KEYS_STORE_KEY, {})
  const userApiKeys = { ...(modelApiKeys[userId] ?? {}) }

  if (!apiKey) {
    delete userApiKeys[configId]
  } else {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('当前系统不支持安全保存模型 API Key')
    }
    userApiKeys[configId] = safeStorage.encryptString(apiKey).toString('base64')
  }

  if (Object.keys(userApiKeys).length === 0) {
    delete modelApiKeys[userId]
  } else {
    modelApiKeys[userId] = userApiKeys
  }
  store.set(MODEL_API_KEYS_STORE_KEY, modelApiKeys)
}

const getModelApiKey = (modelConfig) => {
  const { userId, configId } = getModelApiKeyIdentity(modelConfig)
  const encryptedApiKey = store.get(MODEL_API_KEYS_STORE_KEY, {})?.[userId]?.[configId]

  if (!encryptedApiKey) return ''
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统不支持读取模型 API Key')
  }

  return safeStorage.decryptString(Buffer.from(encryptedApiKey, 'base64'))
}

// 存储用户信息
ipcMain.handle('window:setUserInfo', (e, userInfoType, userInfo) => {
  console.log(userInfoType)
  console.info('设置用户信息', userInfoType, userInfoType === 'modelApiKey' ? '[REDACTED]' : userInfo)
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
    case 'email':
    case 'birthday':
      store.set(userInfoType, userInfo)
      break
    case 'gender':
      store.set('gender', userInfo)
      break
    case 'notificationSettings': {
      const settings = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('通知设置格式无效')
      store.set('notificationSettings', settings)
      break
    }
    case 'modelApiKey':
      setModelApiKey(userInfo)
      break
  }
  return true
})

// 获取用户信息
ipcMain.handle('window:getUserInfo', (e, userInfoType, userInfo) => {
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
      case 'email':
      case 'birthday':
        return store.get(userInfoType)
      case 'gender':
        return store.get('gender')
      case 'notificationSettings':
        return store.get('notificationSettings')
      case 'modelApiKey':
        return getModelApiKey(userInfo)
      default:
        return null
    }
  })()
  console.log('获取到的值:', userInfoType === 'modelApiKey' ? '[REDACTED]' : result)
  return result
})
