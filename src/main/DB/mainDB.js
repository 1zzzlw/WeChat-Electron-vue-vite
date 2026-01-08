const fs = require('fs')
const Database = require('better-sqlite3')
import { init_table, table_index } from './tableInfo'

// 自定义DB文件存储路径
const userDir = 'E:\\JavaWeb\\zzz-IM-web\\db\\'

// 把 SQLite 内部执行的每一条 SQL 语句和相关信息输出到控制台，便于开发阶段调试。
const db = new Database(userDir + 'local.db', { verbose: console.log })

// 开启 WAL 模式，提高并发性能
db.pragma('journal_mode = WAL')

const initTable = () => {
    // 初始化表
    for (const sql of init_table) {
        try {
            // trim() 移除字符串开头和结尾的空白字符（包括空格、制表符 \t、换行符 \n 等），但不会动中间的空白。
            db.exec(sql.trim())
        } catch (err) {
            console.error('表初始化失败', err.message)
            return
        }
    }

    // 初始化索引
    for (const index of table_index) {
        try {
            db.exec(index.trim())
        } catch (error) {
            console.error('表索引初始化失败', err.message)
        }
    }
}

export {
    db,
    initTable
}
