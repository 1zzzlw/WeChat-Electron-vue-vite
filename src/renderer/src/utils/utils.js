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

const base64ToBlob = (base64) => {
    // 提取 mimeType（如 image/png）
    const mimeType = base64.match(/data:([^;]+);/)[1];
    const byteString = atob(base64.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mimeType });
}

const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

export {
    formatMessageTime,
    base64ToBlob,
    blobToBase64
}