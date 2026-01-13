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
    const sql = `select id, user_id, target_id, name, avatar, remark, type, is_top, unread_count, latest_msg, latest_msg_time from conversation where user_id = ? and status = 1`
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
    const sql = `select user_id, friend_id, username, avatar, remark, relation_status from friend_relation where user_id = ?`
    const result = queryAll(sql, userId)
    return result
}

// 查询消息列表
const loadMessage = (conversationId, messagePageInfo) => {
    const { pageNO, maxMessageId } = messagePageInfo
    // 获得消息总数
    let sql = `select count(*) as total from message where conversation_id = ?`
    const totalCount = queryAll(sql, conversationId)[0].total
    console.log(totalCount)
    console.log(`${conversationId}会话的消息总数为${totalCount}`)
    const params = []
    // 根据消息总数和页码计算当前查询页码偏移量
    const { pageTotal, pageSize, offset } = computedOffset(totalCount, pageNO)
    sql = `select * from message where conversation_id = ?`
    params.push(conversationId)
    // 判断是否为第一次查询
    if (maxMessageId) {
        // 如果 maxMessageId 有值，就说明不是第一次查询
        sql = sql + `and maxMessageId < ?`
        params.push(maxMessageId)
    }
    sql = sql + `order by id desc limit ?, ?`
    params.push(offset)
    params.push(pageSize)
    const dataList = queryAll(sql, params)
    console.log(dataList)
    console.log(pageNO)
    return {
        dataList: dataList,
        pageTotal: pageTotal,
        pageNO: pageNO
    }
}


export {
    isExistUserRecord,
    queryConversation,
    queryFriend,
    loadMessage
}