import { queryAll } from './mainDB'

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



export {
    isExistUserRecord,
    queryConversation,
    queryFriend,
}