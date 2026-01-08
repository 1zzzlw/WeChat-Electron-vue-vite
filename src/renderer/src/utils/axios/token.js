export function getAccessToken() {
  return localStorage.getItem('token')
}

export async function getRefreshToken() {
  return await window.userInfoApi.storeGetUserInfo('token')
}
