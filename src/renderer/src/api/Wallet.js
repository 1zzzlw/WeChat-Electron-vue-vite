import request from '../utils/axios/request'

/** 查询钱包信息（余额 + 冻结金额） */
export const getWalletInfoApi = () =>
  request.get('/wallet/info')

/** 充值 */
export const rechargeApi = (data) =>
  request.post('/wallet/recharge', data)

/** 提现 */
export const withdrawApi = (data) =>
  request.post('/wallet/withdraw', data)

/**
 * 查询账单流水
 * @param {number} page
 * @param {number} pageSize
 * @param {number} type 0=全部 1=充值 2=提现 3=打赏支出 4=打赏收入 5=红包支出 6=红包收入 7=转账支出 8=转账收入
 */
export const getWalletRecordsApi = (page = 1, pageSize = 20, type = 0) =>
  request.get('/wallet/records', { params: { page, pageSize, type } })
