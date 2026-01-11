import { db } from './mainDB'

// 查询是否存在用户的登录记录
const isExistUserRecord = (userId) => {
    const query = db.prepare('SELECT 1 FROM device_user_record WHERE user_id = ?')
        .get(userId)
    return !!query
}

export {
    isExistUserRecord
}