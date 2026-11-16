import { safeStorage } from 'electron'
import { store } from '../shared.js'
import { accounts } from '../DB/mainDB.js'
import accountSessionModule from './accountSession.cjs'

export const accountSession = new accountSessionModule.AccountSession(store, safeStorage, accounts)
