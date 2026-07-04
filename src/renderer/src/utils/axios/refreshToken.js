import request from '@/utils/axios/request'
import { getRefreshToken } from '@/utils/axios/token'

// 刷新token的promise，避免重复刷新token
let promise

export async function refreshToken(userId) {
  // 如果promise已经存在，说明已经在刷新，直接返回原promise
  if (promise) {
    return promise
  }
  // 如果没有promise，创建新的promise
  promise = new Promise(async (resolve) => {
    const refreshToken = await getRefreshToken(userId)
    // 从本地获取刷新token
    console.info('刷新token')
    const res = await request.post(
      `/user/refreshToken/${userId}`,
      {},
      {
        headers: {
          Authorization: `${refreshToken}`
        },
        // 用来标识当前请求是刷新token的请求
        __isRefreshToken: true
      }
    )
    resolve(res.code === 1)
  })
  promise.finally(() => {
    // 刷新token完成后，将promise重置为null
    promise = null
  })
  return promise
}

export function isRefreshToken(config) {
  return !!config.__isRefreshToken
}
