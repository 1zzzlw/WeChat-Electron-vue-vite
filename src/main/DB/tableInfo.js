const init_table = [
  `
    CREATE TABLE IF NOT EXISTS message (
    id                INTEGER  NOT NULL PRIMARY KEY,
    user_id           INTEGER  NOT NULL,
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
  `
    CREATE TABLE IF NOT EXISTS device_user_record (
    user_id     INTEGER  NOT NULL PRIMARY KEY,  -- 用户ID
    first_login_time  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 首次登录时间
    last_login_time   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 最后登录时间
    device_tag        TEXT,  -- 设备标识
    app_version       TEXT   -- 首次登录时的App版本
  );
  `
]

const table_index = [
  `
    CREATE INDEX IF NOT EXISTS idx_message_conversation 
    ON message (conversation_id ASC);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_msg_user_conv 
    ON message (user_id, conversation_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_message_send_time 
    ON message (send_time ASC);
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