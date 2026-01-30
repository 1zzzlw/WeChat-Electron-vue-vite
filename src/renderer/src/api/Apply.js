import request from '../utils/axios/request'

export const sendApplyApi = (applyInfo) => request.post('/apply/send', applyInfo)

export const getApplyListApi = () => request.get('/apply/list')

export const dealApplyApi = (applyId, dealResult, fromUserId) =>
  request.post('/apply/deal', { applyId, dealResult, fromUserId })

export const sendGroupApplyApi = (formData) =>
  request.post(`/apply/create`, formData)

export const getGroupApplyListApi = () => request.get('/apply/groupApplyList')

export const dealGroupApplyApi = (formData) =>
  request.post('/apply/groupApply/deal', formData)
