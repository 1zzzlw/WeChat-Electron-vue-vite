import { queryAll } from './mainDB'
import { computedOffset } from './utils'

/**
 * @param userId -- 用户id 
 * @returns -- true 存在，false 不存在
 */
const isExistUserRecord = (userId) => {
    const sql = 'select 1 from device_user_record where user_id = ?'
    const result = queryAll(sql, userId)
    if (result.length > 0) {
        // 存在登录记录
        return true
    } else {
        // 不存在登录记录
        return false
    }
}

/**
 * 查询当前登录用户的所有会话列表
 * @param userId -- 用户id
 * @returns -- 返回查询结果
 */
const queryConversation = (userId) => {
    const sql = `select * from conversation where user_id = ? and status = 1`
    const result = queryAll(sql, userId)
    console.log(result)
    return result
}

/**
 * 查询好友列表
 * @param userId -- 用户id  
 * @returns -- 返回查询结果
 */
const queryFriend = (userId) => {
    const sql = `select * from friend_relation where user_id = ?`
    const result = queryAll(sql, userId)
    return result
}

// 查询消息列表
const loadMessage = (conversationId, messagePageInfo) => {
    const { pageNO, maxMessageId } = messagePageInfo
    // 获得消息总数
    let sql = `select count(*) as total from message where conversation_id = ?`
    const totalCount = queryAll(sql, conversationId)[0].total
    console.log(`${conversationId}会话的消息总数为${totalCount}`)
    const params = []
    // 根据消息总数和页码计算当前查询页码偏移量
    const { pageTotal, pageSize, offset } = computedOffset(totalCount, pageNO)
    sql = `select * from message where conversation_id = ?`
    params.push(conversationId)
    // 判断是否为第一次查询
    if (maxMessageId) {
        // 如果 maxMessageId 有值，就说明不是第一次查询
        sql = sql + `and id < ?`
        params.push(maxMessageId)
    }
    sql = sql + ` order by id desc limit 0, ?`
    // params.push(Number.parseInt(offset, 10))
    params.push(Number.parseInt(pageSize, 10))
    const dataList = queryAll(sql, params)
    console.log(dataList)
    console.log(pageNO)
    return {
        dataList: dataList,
        pageTotal: pageTotal,
        pageNO: pageNO
    }
}

// 根据好友id查询好友信息
const getFriendInfoById = (userId, friendId) => {
    const sql = `select * from friend_relation where user_id = ? and friend_id = ?`
    const params = [userId, friendId]
    const result = queryAll(sql, params)
    return result
}

// 根据会话id查询会话信息
const getConversationInfoById = (userId, conversationId) => {
    const sql = `select * from conversation where user_id = ? and id = ?`
    const params = [userId, conversationId]
    const result = queryAll(sql, params)
    return result
}

const getImageUrlList = () => {
    const sql = `select file_id, file_name, file_size, remote_url from message where msg_type = 2 order by send_time`
    const params = []
    const result = queryAll(sql, params)
    return result
}

export {
    isExistUserRecord,
    queryConversation,
    queryFriend,
    loadMessage,
    getFriendInfoById,
    getConversationInfoById,
    getImageUrlList
}