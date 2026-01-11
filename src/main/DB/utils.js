/**
 * 数据库命名字段转驼峰命名字段
 * @param data -- 每行的字段数据格式为：'user_id': '123'
 * @returns 格式为：'userId': '123'
*/
const convertDBObjToCamelCase = (data) => {
    if (!data) {
        return null
    }
    const convertData = {}
    for (let item in data) {
        convertData[toCamelCase(item)] = data[item]
    }
    return convertData
}

// 驼峰命名字段转数据库命名字段


/**
 * 将命名格式转化为驼峰命名格式
 * @param item -- 字符串
 */
const toCamelCase = (item) => {
    /**
     * 替换_(n)下划线和第一个小写字母，将小写字母存在p里
     * g 全局匹配，字符串所有的下划线加小写字母组合都需要进行替换  
     * */
    return item.replace(/_([a-z])/g, function (match, letter) {
        return letter.toUpperCase();
    })
}

export {
    convertDBObjToCamelCase,
    toCamelCase
}