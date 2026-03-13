import { Snowflake } from "@theinternetfolks/snowflake"

/**
 * 生成系统消息发送包
 * @param {*} receiverId -- 接收者id 
 * @param {*} convId -- 会话id
 * @param {*} subType -- 系统消息类型
 * @returns 
 */
async function createSystemMessagePack(receiverId, convId, subType) {
    const userId = await window.userInfoApi.storeGetUserInfo('userId');
    const id = Snowflake.generate()
    const systemPack = {
        id: id,
        senderId: userId,
        conversationId: convId,
        receiverId: receiverId,
        msgType: 99,
        subType: subType,
    }
    return systemPack
}

export {
    createSystemMessagePack
}