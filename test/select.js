
const computedOffset = (totalCount, pageNO) => {
    const pageSize = 20
    // 计算出分页总数
    const pageTotal = Math.ceil(totalCount / pageSize) - 1
    // 页码不能小于1
    pageNO = pageNO < 1 ? 1 : pageNO
    // 页码不能大于总页码
    pageNO = pageNO > pageTotal ? pageTotal : pageNO
    // 计算出偏移量
    const offset = pageNO * pageSize > totalCount ? totalCount : pageNO * pageSize
    console.info(pageTotal, offset)
}

computedOffset(89, 4)