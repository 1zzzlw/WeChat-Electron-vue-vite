import { defineStore } from 'pinia'

interface IRegisterInfoStore {
  userName: string
  phoneNumber: string
  password: string
  gender: string
}

export const useRegisterInfoStore = defineStore('registerInfo', {
  state: (): IRegisterInfoStore => ({
    userName: '',
    phoneNumber: '',
    password: '',
    gender: ''
  }),
  actions: {
    setRegisterInfo(partialInfo: Partial<IRegisterInfoStore>) {
      this.userName = partialInfo.userName || this.userName
      this.phoneNumber = partialInfo.phoneNumber || this.phoneNumber
      this.password = partialInfo.password || this.password
      this.gender = partialInfo.gender || this.gender
    },
    getRegisterOneInfo() {
      return {
        userName: this.userName,
        phoneNumber: this.phoneNumber
      }
    },
    getRegisterTwoInfo() {
      return {
        password: this.password,
        gender: this.gender
      }
    }
  }
})
