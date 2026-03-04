import dayjs from 'dayjs'

// 最新时间的展示
const formatMessageTime = (timestamp) => {
    if (!timestamp) return undefined

    const now = dayjs()
    const msgTime = dayjs(timestamp)
    const diffDays = now.diff(msgTime, 'day')
    const diffHours = now.diff(msgTime, 'hour')

    // 今天（小于24小时）
    if (diffHours < 24 && now.date() === msgTime.date()) {
        return msgTime.format('HH:mm')
    }

    // 昨天
    if (diffDays === 1 || (diffHours < 48 && now.date() - msgTime.date() === 1)) {
        return '昨天'
    }

    // 本周内（从本周一到今天）
    const startOfWeek = now.startOf('week').add(1, 'day')
    if (msgTime.isAfter(startOfWeek) || msgTime.isSame(startOfWeek, 'day')) {
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
        return `${weekdays[msgTime.day()]}  ${msgTime.format('HH:mm')}`
    }

    // 超过7天显示日期
    return msgTime.format('MM-DD HH:mm')
}

export {
    formatMessageTime
}