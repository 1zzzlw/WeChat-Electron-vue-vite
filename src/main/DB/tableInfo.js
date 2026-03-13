const init_table = [
  // 消息表
  `
    CREATE TABLE IF NOT EXISTS message (
    id                TEXT  NOT NULL PRIMARY KEY,
    sender_id         INTEGER  NOT NULL,
    conversation_id   TEXT     NOT NULL,
    receiver_id       TXT      NOT NULL,
    msg_type          INTEGER  NOT NULL,
    sub_type          INTEGER  NOT NULL,
    content           TEXT,
    send_status       INTEGER  NOT NULL DEFAULT 0,
    read_status       INTEGER  NOT NULL DEFAULT 1,
    send_time         TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked        INTEGER  NOT NULL DEFAULT 0,
    is_deleted        INTEGER  NOT NULL DEFAULT 0,         -- 0=未删除, 1=删除
    quote_msg_id      INTEGER  DEFAULT NULL,
    file_id           TEXT DEFAULT NULL,                   -- 文件的唯一id
    file_name         TEXT DEFAULT NULL,                   -- 文件名
    file_size         INTEGER DEFAULT 0,                   -- 文件大小（B）
    bucket            TEXT DEFAULT NULL,                   -- 桶名称
    remote_path       TEXT DEFAULT NULL,                   -- 远程存储文件路径
    local_path        TEXT DEFAULT NULL,                   -- 本地存储绝对路径（未下载时为 NULL）
    remote_url        TEXT DEFAULT NULL,                   -- 服务端 MinIO 地址
    preview_base64    TEXT DEFAULT NULL,                   -- 图片和视频的预览图
    download_status   INTEGER DEFAULT 0,                   -- 下载状态：0=未下载，1=已下载
    receive_time      TEXT DEFAULT NULL                    -- 接收时间
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
    id TEXT NOT NULL,                           -- 会话ID
    user_id INTEGER NOT NULL,                   -- 登录用户ID
    target_id TEXT NOT NULL,                    -- 目标ID: 好友ID或群ID
    name TEXT,                                  -- 用于快速显示（昵称/群名）
    avatar TEXT,                                -- 头像URL
    remark TEXT,                                -- 会话备注（用户自定义）
    type INTEGER NOT NULL,                      -- 0-私聊, 1-群聊
    is_top INTEGER DEFAULT 0,                   -- 是否置顶: 0-否, 1-是
    is_mute INTEGER DEFAULT 0,                  -- 是否免打扰: 0-否, 1-是
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
    account TEXT NOT NULL,                  -- 好友账号
    avatar TEXT NOT NULL,                   -- 头像URL
    gender TEXT NOT NULL,                   -- 好友性别
    phone TEXT NOT NULL,                    -- 好友手机号
    email TEXT,                             -- 好友邮箱
    birthday INTEGER,                       -- 好友生日
    address TEXT,                           -- 好友地址 
    remark TEXT,                            -- 当前用户给该好友设置的备注
    relation_status INTEGER NOT NULL,       -- 关系状态: 0=未同意, 1=正常好友, 2=黑名单
    PRIMARY KEY (user_id, friend_id)        -- 用户id和好友id组成的联合主键
  );
  `,
  // 收藏表
  `
    CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    source_username TEXT,
    type       INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
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
  `
    CREATE INDEX IF NOT EXISTS idx_file_id 
    ON message (file_id);
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
  // 会话表中用户id和会话id形成的联合唯一索引
  `
    CREATE UNIQUE INDEX IF NOT EXISTS uk_user_convid ON conversation(user_id, id);
  `,
  // 会话表中会话状态和登录用户ID的联合索引
  `
    CREATE INDEX IF NOT EXISTS idx_conversation_user_status ON conversation(user_id, status);
  `,
  // 好友表的用户ID和好友状态的联合索引
  `
    CREATE INDEX IF NOT EXISTS idx_friend_user_status ON friend_relation(user_id, relation_status);
  `,
  // 收藏表的用户id索引
  `
    CREATE INDEX IF NOT EXISTS idx_user_id ON favorites(user_id);
  `,
  // 收藏表的创建时间索引
  `
    CREATE INDEX IF NOT EXISTS idx_created_at ON favorites(created_at);
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