import { globalColumnsMap, run } from "./mainDB";

/**
 * 初始化信息一键多条插入
 * @param tableName 表名
 * @param data 数据
*/
const initInsert = (tableName, data) => {
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
    const sql = `insert or ignore into ${tableName} (${tableFieldNames.join(",")}) values ${batchPlaceholder}`
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
    const tableFieldNames = []
    const params = []
    for (let item in data) {
        if (data[item] !== undefined && columnsMap[item] != undefined) {
            // 加入数据库格式的的字段名
            tableFieldNames.push(columnsMap[item])
            // 加入该字段的值
            params.push(data[item])
        }
    }
    const placeholder = tableFieldNames.map(() => '?').join(',')
    const sql = `insert into ${tableName} (${tableFieldNames.join(',')}) values (${placeholder})`
    return run(sql, params)
}

export {
    initInsert,
    insert
}