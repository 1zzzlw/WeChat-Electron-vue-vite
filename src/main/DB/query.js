import { db } from "./mainDB"
import { convertDBObjToCamelCase } from './utils'

const queryAll = (sql, params) => {
    try {
        const stmt = db.prepare(sql)
        const rows = stmt.all(params);

        return rows.map(row => convertDBObjToCamelCase(row));
    } catch (err) {
        console.error('查询失败:', err, sql);
        return [];
    }
}

export {
    queryAll
}