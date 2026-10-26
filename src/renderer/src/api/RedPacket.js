import request from '@/utils/axios/request'

/**
 * 发送红包；响应拦截器已解包 HTTP response.data。
 * @returns {Promise<{ code: number, msg?: string, data: { id: string | number } | null }>}
 */
export const sendRedPacketApi = (data) =>
  request.post('/redPacket/send', data)

/** 抢红包 */
export const grabRedPacketApi = (redPacketId) =>
  request.post(`/redPacket/grab/${redPacketId}`)

/** 红包详情（含领取记录） */
export const getRedPacketDetailApi = (redPacketId) =>
  request.get(`/redPacket/detail/${redPacketId}`)
