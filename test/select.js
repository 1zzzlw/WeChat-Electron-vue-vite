
// const computedOffset = (totalCount, pageNO) => {
//     const pageSize = 20
//     // 计算出分页总数
//     const pageTotal = Math.ceil(totalCount / pageSize) - 1
//     // 页码不能小于1
//     pageNO = pageNO < 1 ? 1 : pageNO
//     // 页码不能大于总页码
//     pageNO = pageNO > pageTotal ? pageTotal : pageNO
//     // 计算出偏移量
//     const offset = pageNO * pageSize > totalCount ? totalCount : pageNO * pageSize
//     console.info(pageTotal, offset)
// }

// computedOffset(89, 4)

const a = '2010553506151907300'

const b = '2011028583804903400'

// 默认逐字符比较（适合字符串形式的数字，且位数相同）
const result1 = a.localeCompare(b);
console.log(result1); // -1（表示 a < b）

// 验证：b 对比 a
const result2 = b.localeCompare(a);
console.log(result2); // 1（表示 b > a）

console.info(a < b ? -1 : 1)

console.info(a > b ? -1 : 1)
