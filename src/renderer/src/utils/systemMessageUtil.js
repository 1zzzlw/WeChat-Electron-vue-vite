import { Snowflake } from "@theinternetfolks/snowflake"
import dayjs from "dayjs";

/**
 * 生成系统消息发送包
 * @param {*} receiverId -- 接收者id 
 * @param {*} convId -- 会话id
 * @param {*} subType -- 系统消息类型
 * @returns 
 */
async function createSystemMessagePack(receiverId, convId, subType, content, receiverIds) {
    const userId = await window.userInfoApi.storeGetUserInfo('userId');
    const id = Snowflake.generate()

    // 在前端生成发送消息的时间，写入本地数据库和后端MySQL数据库
    const sendTimeStamp = dayjs().valueOf()
    const sendTime = dayjs(sendTimeStamp).format('YYYY-MM-DD HH:mm:ss')

    const systemPack = {
        id: id,
        senderId: userId,
        conversationId: convId,
        receiverId: receiverId,
        receiverIds: receiverIds,
        content: content,
        msgType: 99,
        subType: subType,
        sendTime: sendTime
    }
    return systemPack
}

export {
    createSystemMessagePack
}