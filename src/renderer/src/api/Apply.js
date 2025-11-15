import request from '../utils/request'

export const sendApplyApi = (applyInfo) => request.post('/apply/send', applyInfo)

export const getApplyListApi = () => request.get('/apply/list')

export const dealApplyApi = (applyId, dealResult, fromUserId) =>
  request.post('/apply/deal', { applyId, dealResult, fromUserId })
