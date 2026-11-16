const DEVICE_USER_TABLE_SQL = `CREATE TABLE IF NOT EXISTS device_user_record (
  user_id TEXT NOT NULL PRIMARY KEY,
  account TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  first_login_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  device_tag TEXT,
  app_version TEXT,
  remember_login INTEGER NOT NULL DEFAULT 0,
  data_initialized INTEGER NOT NULL DEFAULT 0
)`

function migrateDeviceUserRecords(db) {
  const columns = db.prepare('PRAGMA table_info(device_user_record)').all()
  if (!columns.length) return db.exec(DEVICE_USER_TABLE_SQL)
  if (columns.find((c) => c.name === 'user_id').type.toUpperCase() !== 'TEXT') {
    // CAST 在 SQLite 内完成，避免旧 INTEGER 用户 ID 经过 JS Number 时丢失精度。
    const existing = new Set(columns.map((c) => c.name))
    const names = [
      'account',
      'username',
      'avatar',
      'first_login_time',
      'last_login_time',
      'device_tag',
      'app_version',
      'remember_login',
      'data_initialized'
    ]
    const defaults = {
      account: "''",
      username: "''",
      avatar: "''",
      first_login_time: 'CURRENT_TIMESTAMP',
      last_login_time: 'CURRENT_TIMESTAMP',
      device_tag: 'NULL',
      app_version: 'NULL',
      remember_login: '0',
      data_initialized: '1'
    }
    db.transaction(() => {
      db.exec('ALTER TABLE device_user_record RENAME TO device_user_record_legacy')
      db.exec(DEVICE_USER_TABLE_SQL)
      db.exec(
        `INSERT INTO device_user_record (user_id,${names.join(',')}) SELECT CAST(user_id AS TEXT),${names.map((n) => (existing.has(n) ? n : defaults[n])).join(',')} FROM device_user_record_legacy`
      )
      db.exec('DROP TABLE device_user_record_legacy')
    })()
  } else {
    const existing = new Set(columns.map((c) => c.name))
    for (const [name, definition] of Object.entries({
      account: "TEXT NOT NULL DEFAULT ''",
      username: "TEXT NOT NULL DEFAULT ''",
      avatar: "TEXT NOT NULL DEFAULT ''",
      remember_login: 'INTEGER NOT NULL DEFAULT 0',
      data_initialized: 'INTEGER NOT NULL DEFAULT 1'
    })) {
      if (!existing.has(name))
        db.exec(`ALTER TABLE device_user_record ADD COLUMN ${name} ${definition}`)
    }
  }
}

function createAccountRepository(db) {
  return {
    list() {
      return db
        .prepare(
          `SELECT user_id AS userId,account,username,avatar,last_login_time AS lastLoginTime,remember_login AS rememberLogin FROM device_user_record WHERE account<>'' ORDER BY last_login_time DESC,user_id`
        )
        .all()
    },
    get(userId) {
      return db.prepare('SELECT * FROM device_user_record WHERE user_id=?').get(String(userId))
    },
    recordLogin(profile, remember) {
      db.prepare(
        `INSERT INTO device_user_record (user_id,account,username,avatar,remember_login) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET account=excluded.account,username=excluded.username,avatar=excluded.avatar,remember_login=excluded.remember_login,last_login_time=CURRENT_TIMESTAMP`
      ).run(
        String(profile.id),
        profile.account || '',
        profile.username || '',
        profile.avatar || '',
        remember ? 1 : 0
      )
    },
    cacheProfile(profile) {
      db.prepare('UPDATE device_user_record SET account=?,username=?,avatar=? WHERE user_id=?').run(
        profile.account || '',
        profile.username || '',
        profile.avatar || '',
        String(profile.id)
      )
    },
    remember(userId, enabled) {
      db.prepare('UPDATE device_user_record SET remember_login=? WHERE user_id=?').run(
        enabled ? 1 : 0,
        String(userId)
      )
    },
    markInitialized(userId) {
      db.prepare('UPDATE device_user_record SET data_initialized=1 WHERE user_id=?').run(
        String(userId)
      )
    },
    remove(userId) {
      db.prepare('DELETE FROM device_user_record WHERE user_id=?').run(String(userId))
    }
  }
}

module.exports = { DEVICE_USER_TABLE_SQL, migrateDeviceUserRecords, createAccountRepository }
