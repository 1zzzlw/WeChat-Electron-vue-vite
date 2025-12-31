export function getAccessToken() {
  return localStorage.getItem('token')
}

export async function getRefreshToken() {
  return await window.api.storeGetUserInfo('token')
}
