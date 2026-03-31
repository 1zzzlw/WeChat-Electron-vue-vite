/**
 * 系统消息类型枚举 (msgType: 99)
 * 用于细分 sub_type 字段
 */
export const SystemMsgSubType = Object.freeze({
    // --- 基础/通用 ---
    RECALL: 10,           // 撤回消息通知

    // --- 好友相关 ---
    FRIEND_ADDED: 20,     // 成为好友成功 (双方相同的展示)
    FRIEND_DELETED: 21,   // 被对方删除 (静默处理，WS通知)
    FRIEND_BLACKLIST: 22, // 被拉黑 (发送消息时返回)

    // --- 群聊相关 ---
    GROUP_JOINED: 30,     // 成员入群 (xx加入了群聊)
    GROUP_KICKED: 31,     // 成员被踢 (xx被移出群聊)
    GROUP_LEAVED: 32,     // 成员退群 (xx退出了群聊)
    GROUP_DISBANDED: 33,  // 群解散 (群聊已解散)
})

/**
 * 系统消息模板配置
 * 建议 content 存储 JSON 字符串，包含以下占位符
 */
const SystemMsgTemplates = {
    [SystemMsgSubType.RECALL]: "{name} 撤回了一条消息",
    [SystemMsgSubType.FRIEND_ADDED]: "你们已成为好友，现在可以开始聊天了！",
    [SystemMsgSubType.FRIEND_DELETED]: "你们不在是好友",
    [SystemMsgSubType.FRIEND_BLACKLIST]: "消息已发出，但被对方拒收了",
    [SystemMsgSubType.GROUP_JOINED]: "{name} 加入了群聊",
    [SystemMsgSubType.GROUP_KICKED]: "{name} 被移出了群聊",
    [SystemMsgSubType.GROUP_LEAVED]: "{name} 退出了群聊",
    [SystemMsgSubType.GROUP_DISBANDED]: "该群聊已被解散",
}

/**
 * 获取系统消息文本
 * @param {number} subType - 子类型
 * @param {object} [data={}] - 数据 (如 { name: '张三' })
 * @returns {string} 最终文本
 **/
export function getSystemMsgText(subType, data = {}) {
    return (SystemMsgTemplates[subType] || '未知系统消息')
        .replace(/\{(\w+)\}/g, (_, key) => data[key] || '') // 正则匹配 {name}
}