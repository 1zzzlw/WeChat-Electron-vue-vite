const globalColumnsMap = {
    message: {
        id: 'id',
        senderId: 'sender_id',
        conversationId: 'conversation_id',
        receiverId: 'receiver_id',
        msgType: 'msg_type',
        content: 'content',
        sendStatus: 'send_status',
        readStatus: 'read_status',
        sendTime: 'send_time',
        isRevoked: 'is_revoked',
        quoteMsgId: 'quote_msg_id'
    },
    device_user_record: {
        userId: 'user_id',
        firstLoginTime: 'first_login_time',
        lastLoginTime: 'last_login_time',
        deviceTag: 'device_tag',
        appVersion: 'app_version'
    },
    conversation: {
        id: 'id',
        userId: 'user_id',
        targetId: 'target_id',
        name: 'name',
        avatar: 'avatar',
        remark: 'remark',
        type: 'type',
        isTop: 'is_top',
        unreadCount: 'unread_count',
        latestMsg: 'latest_msg',
        latestMsgTime: 'latest_msg_time',
        status: 'status',
        createTime: 'create_time',
        updateTime: 'update_time'
    },
    friend_relation: {
        userId: 'user_id',
        friendId: 'friend_id',
        username: 'username',
        avatar: 'avatar',
        remark: 'remark',
        relationStatus: 'relation_status'
    }
}

const insert = (tableName, data) => {
    // 获得该表的字段映射关系
    const columnsMap = globalColumnsMap[tableName]
    const tableFieldNames = []
    const params = []
    for (let item in data) {
        // data[item] !== undefined 没有值的就不进行插入
        if (data[item] !== undefined && columnsMap[item] != undefined) {
            // 加入数据库格式的的字段名
            tableFieldNames.push(columnsMap[item])
            // 加入该字段的值
            params.push[data[item]]
        }
    }
    const placeholder = tableFieldNames.map(() => '?').join(',')
    const sql = `insert into ${tableName} (${tableFieldNames.join(',')}) values (${placeholder})`
    console.log(sql)
    // return run(sql)
}

insert('device_user_record', {
    userId: 1,
    appVersion: 2.0,
    deviceTag: null
})