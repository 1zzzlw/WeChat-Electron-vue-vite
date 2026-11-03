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
const loadMessage = (conversationId, messagePageInfo, userId) => {
    const { pageNO, maxMessageId } = messagePageInfo
    // 获得消息总数
    let sql = `select count(*) as total from message where conversation_id = ?`
    const totalCount = queryAll(sql, conversationId)[0].total
    console.log(`${conversationId}会话的消息总数为${totalCount}`)
    if (messagePageInfo.anchorMessageId) {
        const anchorId = String(messagePageInfo.anchorMessageId)
        const authorized = getConversationInfoById(userId, conversationId).length > 0
        const found = authorized && queryAll('select id from message where conversation_id = ? and id = ? and is_deleted = 0 and is_revoked = 0', [conversationId, anchorId]).length > 0
        if (!found) return { dataList: [], pageTotal: 0, pageNO, anchorFound: false }
        const older = queryAll('select * from message where conversation_id = ? and id <= ? and is_deleted = 0 order by id desc limit 21', [conversationId, anchorId])
        const newer = queryAll('select * from message where conversation_id = ? and id > ? and is_deleted = 0 order by id asc limit 20', [conversationId, anchorId])
        return { dataList: [...newer.reverse(), ...older], pageTotal: Math.ceil(totalCount / 30), pageNO, anchorFound: true }
    }
    const params = []
    // 根据消息总数和页码计算当前查询页码偏移量
    const { pageTotal, pageSize, offset } = computedOffset(totalCount, pageNO)
    sql = `select * from message where conversation_id = ? and is_deleted = 0 `
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

const getVideoUrlList = () => {
    const sql = `select file_id, file_name, file_size, remote_url from message where msg_type = 3 order by send_time`
    const params = []
    const result = queryAll(sql, params)
    return result
}

/**
 * 获得收藏表中的笔记内容
 * @param userId -- 用户id
 * @returns 
 */
const getFavorites = (userId) => {
    const sql = `select * from favorites where user_id = ? and type = 0`
    const params = [userId]
    const result = queryAll(sql, params)
    return result
}

/**
 * 获得收藏表中的所有内容（包括笔记和消息收藏）
 * @param userId -- 用户id
 * @returns 
 */
const getFavoritesAll = (userId) => {
    const sql = `select * from favorites where user_id = ? order by created_at desc`
    const params = [userId]
    const result = queryAll(sql, params)
    return result
}

const getNodeCount = (userId) => {
    const sql = `select count(*) as total from favorites where user_id = ? and type = 0`
    const params = [userId]
    const result = queryAll(sql, params)
    return Number(result?.[0]?.total) || 0
}

// 本地模糊搜索只查询当前账号，输入中的 LIKE 通配符按普通字符处理。
const searchLocal = (userId, keyword, scope = 'all') => {
    const query = typeof keyword === 'string' ? keyword.trim().slice(0, 128) : ''
    if (!userId || !query) return { contacts: [], conversations: [], messages: [] }
    const pattern = '%' + query.replace(/[!%_]/g, character => '!' + character) + '%'
    const contacts = queryAll(`select * from friend_relation
        where user_id = ? and relation_status != 0
        and (username like ? escape '!' or remark like ? escape '!' or account like ? escape '!')
        order by username limit 30`, [userId, pattern, pattern, pattern])
    if (scope === 'contacts') return { contacts, conversations: [], messages: [] }
    const conversations = queryAll(`select * from conversation
        where user_id = ? and type in (0, 1)
        and (name like ? escape '!' or remark like ? escape '!')
        order by is_top desc, update_time desc limit 30`, [userId, pattern, pattern])
    const messages = queryAll(`select m.id, m.conversation_id, m.content, m.send_time, m.msg_type,
        m.file_name, c.name as conversation_name, c.remark as conversation_remark,
        c.avatar as conversation_avatar, c.type as conversation_type
        from message m join conversation c on c.id = m.conversation_id and c.user_id = ?
        where c.type in (0, 1) and m.is_deleted = 0 and m.is_revoked = 0
        and m.msg_type in (1, 2, 3, 4, 5)
        and (m.content like ? escape '!' or m.file_name like ? escape '!')
        order by m.send_time desc, m.id desc limit 30`, [userId, pattern, pattern])
    return { contacts, conversations, messages }
}

export {
    searchLocal,
    isExistUserRecord,
    queryConversation,
    queryFriend,
    loadMessage,
    getFriendInfoById,
    getConversationInfoById,
    getImageUrlList,
    getVideoUrlList,
    getFavorites,
    getFavoritesAll,
    getNodeCount
}
