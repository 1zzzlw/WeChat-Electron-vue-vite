export interface AccountSnapshot {
  userId: string
  revision: number
  accessToken: string
}

export interface RecentAccount {
  userId: string
  account: string
  username: string
  avatar: string
  lastLoginTime: string
  rememberLogin: boolean
  canQuickLogin: boolean
}

export interface AccountApi {
  listAccounts(): Promise<RecentAccount[]>
  capabilities(): Promise<{ canRememberLogin: boolean }>
  getSession(): Promise<AccountSnapshot>
  login(input: {
    account: string
    password: string
    verifyCode: string
    rememberLogin: boolean
  }): Promise<{ code: number; msg?: string }>
  quickLogin(userId: string): Promise<{ code: number; msg?: string; requiresPassword?: boolean }>
  activateSession(
    snapshot: AccountSnapshot,
    profile: unknown,
    tokens: unknown
  ): Promise<AccountSnapshot>
  refreshSession(snapshot: AccountSnapshot): Promise<boolean>
  updateTokens(snapshot: AccountSnapshot, tokens: unknown): Promise<boolean>
  expireSession(snapshot: AccountSnapshot): Promise<boolean>
  switchAccount(): Promise<void>
  removeAccount(userId: string): Promise<boolean>
}

declare global {
  interface Window {
    accountApi: AccountApi
  }
}
