const fs = require('fs')
const Database = require('better-sqlite3')
import { init_table, table_index } from './tableInfo'
import { toCamelCase, convertDBObjToCamelCase } from './utils'
import { join } from 'path'

// 自定义DB文件存储路径
// const userDir = 'E:\\JavaWeb\\zzz-IM-web\\db\\'
const userDir = join(__dirname, '../../db')

console.log(userDir)

// 把 SQLite 内部执行的每一条 SQL 语句和相关信息输出到控制台，便于开发阶段调试。
const db = new Database(userDir + '\\local.db', { verbose: console.log })

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
            console.error('表索引初始化失败', error.message)
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
 * 一键多条插入
 * @param insertPrefix 插入前缀
 * @param tableName 表名
 * @param data 数据
*/
const multipleInsert = (insertPrefix, tableName, data) => {
    // 获得该表的字段映射关系
    const columnsMap = globalColumnsMap[tableName]
    const fieldKeys = Object.keys(columnsMap)
    // 获取数据库表形式的字段名
    const tableFieldNames = fieldKeys.map(key => columnsMap[key])

    console.log('表名：', tableName, '数据：', tableFieldNames)

    // 插入数据数组 
    const allParams = []
    for (let values of data) {
        for (let fieldKey of fieldKeys) {
            if (columnsMap[fieldKey] != undefined) {
                // 如果数据中没有这个字段，插入 null
                const value = values[fieldKey] !== undefined ? values[fieldKey] : null
                allParams.push(value)
            }
        }
    }

    // 根据数据库的字段名称，生成单条占位符
    const singlePlaceholder = tableFieldNames.map(() => '?').join(',');
    // 根据单条占位符的数量，生成多条占位符
    const batchPlaceholder = data.map(() => `(${singlePlaceholder})`).join(',');
    const sql = `${insertPrefix} into ${tableName} (${tableFieldNames.join(",")}) values ${batchPlaceholder}`
    console.log(sql)
    return run(sql, allParams)
}

/**
 * 插入单条数据
 * @param tableName -- 表名
 * @param data -- 插入数据
 * */
const insert = (tableName, data) => {
    // 获得该表的字段映射关系
    const columnsMap = globalColumnsMap[tableName]
    // 数据库字段名数组
    const tableFieldNames = []
    const params = []
    for (let item in data) {
        if (data[item] != undefined && columnsMap[item] != undefined) {
            // 加入数据库格式的的字段名
            tableFieldNames.push(columnsMap[item])
            // 加入该字段的值
            params.push(data[item])
        }
    }
    const placeholder = tableFieldNames.map(() => '?').join(',')
    const sql = `insert into ${tableName} (${tableFieldNames.join(',')}) values (${placeholder})`
    console.log(sql)
    return run(sql, params)
}

/**
 * 更新表中字段的数据
 * @param tableName -- 表名 
 * @param condition -- 条件
 * @param data -- 更新数据
 */
const update = (tableName, condition, data) => {
    // 获得该表的字段映射关系
    const columnsMap = globalColumnsMap[tableName]
    // 数据库字段名数组
    const dataTableFieldNames = []
    const conditionTableFieldNames = []
    const params = []
    // 拼接修改值的sql语句
    for (let item in data) {
        if (data[item] != undefined && columnsMap[item] != undefined) {
            // 加入数据库格式的的字段名
            dataTableFieldNames.push(`${columnsMap[item]} = ?`)
            // 加入该字段的值
            params.push(data[item])
        }
    }
    // 拼接条件的sql语句
    for (let item in condition) {
        if (condition[item] != undefined && columnsMap[item] != undefined) {
            conditionTableFieldNames.push(`${columnsMap[item]} = ?`)
            // 加入该字段的值
            params.push(condition[item])
        }
    }
    // 将字段名数组拼接成字符串
    const dataPlaceholder = dataTableFieldNames.join(',')
    const conditionPlaceholder = conditionTableFieldNames.join(' and ')
    const sql = `update ${tableName} set ${dataPlaceholder} where ${conditionPlaceholder}`
    console.log(sql)
    return run(sql, params)
}

const deletes = (tableName, condition) => {
    // 获得该表的字段映射关系
    const columnsMap = globalColumnsMap[tableName]
    // 数据库字段名数组
    const conditionTableFieldNames = []
    const params = []
    // 拼接条件的sql语句
    for (let item in condition) {
        if (condition[item] != undefined && columnsMap[item] != undefined) {
            conditionTableFieldNames.push(`${columnsMap[item]} = ?`)
            // 加入该字段的值
            params.push(condition[item])
        }
    }
    const conditionPlaceholder = conditionTableFieldNames.join(' and ')
    const sql = `delete from ${tableName} where ${conditionPlaceholder}`
    console.log(sql)
    return run(sql, params)
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
    multipleInsert,
    insert,
    update,
    deletes,
    run
}
