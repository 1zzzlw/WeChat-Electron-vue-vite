const fs = require('fs')
const Database = require('better-sqlite3')
import { init_table, table_index } from './tableInfo'
import { toCamelCase, convertDBObjToCamelCase } from './utils'
import { insert } from './insert'

// 自定义DB文件存储路径
const userDir = 'E:\\JavaWeb\\zzz-IM-web\\db\\'

// 把 SQLite 内部执行的每一条 SQL 语句和相关信息输出到控制台，便于开发阶段调试。
const db = new Database(userDir + 'local.db', { verbose: console.log })

// 全局的所有表结构的字段映射关系
let globalColumnsMap = []

// 开启 WAL 模式，提高并发性能
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL');

/**
 * 初始化表结构
 * @returns 返回执行结果
 */
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

/**
 * 初始化数据库字段名和驼峰名的映射关系
 */
const initTableColumnsMap = () => {
    // 查询所有的表名
    let sql = `select name from sqlite_master where type = 'table' and name != 'sqlite_sequence'`
    const tables = queryAll(sql, [])
    for (let i = 0; i < tables.length; i++) {
        sql = `PRAGMA table_info(${tables[i].name});`
        // 查询表的字段信息
        let columns = queryAll(sql, []);
        const columnMapItem = {}
        for (let j = 0; j < columns.length; j++) {
            // 格式 userId: 'user_id'
            columnMapItem[toCamelCase(columns[j].name)] = columns[j].name
        }
        globalColumnsMap[tables[i].name] = columnMapItem
    }
    console.log(globalColumnsMap)
}

/**
 * 初始化或更新用户的登录信息
 * @param userId -- 用户id
 */
const initAndUpdateUserLoginRecord = (id) => {
    const data = {
        userId: id
    }
    insert('device_user_record', data)
}

/**
 * 查询数据库表返回驼峰命名格式数据
 * @param  sql sql语句
 * @param  params 查询参数
 * @returns -- 返回驼峰命名的数据格式 
 */
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

/**
 * 执行sql语句
 * @param  sql sql语句
 * @param  params 执行参数
 * @returns 
 */
const run = (sql, params) => {
    try {
        const stmt = db.prepare(sql)
        const result = stmt.run(params)
        return result.changes;
    } catch (err) {
        console.error('操作数据库失败', err)
    }
}

export {
    db,
    globalColumnsMap,
    initTable,
    initTableColumnsMap,
    initAndUpdateUserLoginRecord,
    queryAll,
    run
}
