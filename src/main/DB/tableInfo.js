const init_table = [
  // 消息表
  `
    CREATE TABLE IF NOT EXISTS message (
    id                INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    sender_id         INTEGER  NOT NULL,
    conversation_id   TEXT     NOT NULL,
    receiver_id       INTEGER  NOT NULL,
    msg_type          INTEGER  NOT NULL,
    content           TEXT,
    send_status       INTEGER  NOT NULL,
    read_status       INTEGER  NOT NULL,
    send_time         TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked        INTEGER  NOT NULL DEFAULT 0,
    quote_msg_id      INTEGER
  );
  `,
  // 设备登录记录表
  `
    CREATE TABLE IF NOT EXISTS device_user_record (
    user_id     INTEGER  NOT NULL PRIMARY KEY,  -- 用户ID
    first_login_time  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 首次登录时间
    last_login_time   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 最后登录时间
    device_tag        TEXT,  -- 设备标识
    app_version       TEXT   -- 首次登录时的App版本
  );
  `,
  // 会话表
  `
    CREATE TABLE IF NOT EXISTS conversation (
    id TEXT NOT NULL PRIMARY KEY,               -- 会话ID
    user_id INTEGER NOT NULL,                   -- 登录用户ID
    target_id TEXT NOT NULL,                    -- 目标ID: 好友ID或群ID
    name TEXT,                                  -- 用于快速显示（昵称/群名）
    avatar TEXT,                                -- 头像URL
    remark TEXT,                                -- 会话备注（用户自定义）
    type INTEGER NOT NULL,                      -- 0-私聊, 1-群聊
    is_top INTEGER DEFAULT 0,                   -- 是否置顶: 0-否, 1-是
    unread_count INTEGER DEFAULT 0,
    latest_msg TEXT,
    latest_msg_time INTEGER,                    -- 最后一条消息的发送时间
    status INTEGER NOT NULL DEFAULT 1,          -- 1-显示, 0-隐藏
    create_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    update_time INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
  `,
  // 好友表 
  `
    CREATE TABLE IF NOT EXISTS friend_relation (
    user_id INTEGER NOT NULL,               -- 用户ID
    friend_id INTEGER NOT NULL,             -- 好友的用户ID
    username TEXT NOT NULL,                 -- 好友用户名
    avatar TEXT NOT NULL,                   -- 头像URL
    remark TEXT,                            -- 当前用户给该好友设置的备注
    relation_status INTEGER NOT NULL,       -- 关系状态: 0=未同意, 1=正常好友, 2=黑名单
    PRIMARY KEY (user_id, friend_id)        -- 用户id和好友id组成的联合主键
  );
  `
]

const table_index = [
  // 消息表中的会话索引
  `
    CREATE INDEX IF NOT EXISTS idx_message_conversation 
    ON message (conversation_id ASC);
  `,
  // 消息表中用户id和会话id的联合索引
  `
    CREATE INDEX IF NOT EXISTS idx_msg_user_conv 
    ON message (sender_id, conversation_id);
  `,
  // 消息表中消息发送时间的索引
  `
    CREATE INDEX IF NOT EXISTS idx_message_send_time 
    ON message (send_time ASC);
  `,
  // 会话表的会话更新时间索引
  `
    CREATE INDEX IF NOT EXISTS idx_conversation_update_time ON conversation(update_time DESC);
  `,
  // 会话表中会话状态和登录用户ID的联合索引
  `
    CREATE INDEX IF NOT EXISTS idx_conversation_user_status ON conversation(user_id, status);
  `,
  // 好友表的用户ID和好友状态的联合索引
  `CREATE INDEX IF NOT EXISTS idx_friend_user_status ON friend_relation(user_id, relation_status);
  `
]

// 更新表结构
const update_table = [

]

export {
  init_table,
  table_index,
  update_table
}