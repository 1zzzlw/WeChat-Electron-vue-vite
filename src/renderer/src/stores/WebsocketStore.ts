import { defineStore } from 'pinia'

interface websocketState {
  msg: string
}

export const websocketStore = defineStore('websocketStore', {
  state: () => {
    return {
      msg: ''
    }
  }
})
