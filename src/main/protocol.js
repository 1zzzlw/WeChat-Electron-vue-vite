/**
 * WebSocket 二进制协议编解码模块。
 *
 * 协议格式（与后端 Netty 自定义协议一致）：
 * ┌──────────┬──────┬──────────┬──────────┬──────────┬──────┬──────────┬────────┐
 * │ 魔数 4B  │ 版本 │ 序列化   │ 消息类型 │ 序列号   │ 填充 │ 内容长度 │ 正文   │
 * │ 1,2,3,4 │ 1B   │ 算法 1B  │ 1B       │ 4B       │ 1B   │ 4B       │ NB     │
 * └──────────┴──────┴──────────┴──────────┴──────────┴──────┴──────────┴────────┘
 */

/** @enum {number} */
export const SerializeType = { JSON: 0, JAVA: 1, KRYO: 2, PROTOBUF: 3 }

const MAGIC = [1, 2, 3, 4]
const VERSION = 1
const HEADER_SIZE = 4 + 1 + 1 + 1 + 4 + 1 + 4 // 16 bytes

/**
 * 将 JSON 对象编码为二进制协议帧
 * @param {number} messageType 消息类型
 * @param {number} sequenceId 序列号
 * @param {object} jsonObject 消息体
 * @returns {ArrayBuffer}
 */
export function encodeMessage(messageType, sequenceId, jsonObject) {
  const encoder = new TextEncoder()
  const jsonBytes = encoder.encode(JSON.stringify(jsonObject))
  const totalLength = HEADER_SIZE + jsonBytes.length
  const buffer = new ArrayBuffer(totalLength)
  const view = new DataView(buffer)
  let offset = 0

  // 1. 魔数
  view.setUint8(offset++, MAGIC[0])
  view.setUint8(offset++, MAGIC[1])
  view.setUint8(offset++, MAGIC[2])
  view.setUint8(offset++, MAGIC[3])

  // 2. 版本号
  view.setUint8(offset++, VERSION)

  // 3. 序列化方式（0 = JSON）
  view.setUint8(offset++, SerializeType.JSON)

  // 4. 消息类型
  view.setUint8(offset++, messageType)

  // 5. 序列号
  view.setUint32(offset, sequenceId)
  offset += 4

  // 6. 填充字节
  view.setUint8(offset++, 0xff)

  // 7. 正文长度
  view.setUint32(offset, jsonBytes.length)
  offset += 4

  // 8. 正文
  new Uint8Array(buffer, offset).set(jsonBytes)

  return buffer
}

/**
 * 解码二进制协议帧为结构化对象
 * @param {ArrayBuffer} buffer
 * @returns {{ messageType: number, sequenceId: number, data: object }}
 * @throws {Error} 魔数不匹配时抛出
 */
export function decodeMessage(buffer) {
  const view = new DataView(buffer)
  let offset = 0

  // 1. 校验魔数
  const magic = [
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++)
  ]

  if (magic.join(',') !== MAGIC.join(',')) {
    throw new Error(`协议魔数不匹配，收到: [${magic.join(',')}]，期望: [${MAGIC.join(',')}]`)
  }

  // 2. 版本号
  const version = view.getUint8(offset++)

  // 3. 序列化方式
  const serializeType = view.getUint8(offset++)

  // 4. 消息类型
  const messageType = view.getUint8(offset++)

  // 5. 序列号
  const sequenceId = view.getUint32(offset)
  offset += 4

  // 6. 填充字节
  const padding = view.getUint8(offset++)

  // 7. 正文长度
  const bodyLength = view.getUint32(offset)
  offset += 4

  // 8. 正文
  const body = new Uint8Array(buffer, offset, bodyLength)
  const jsonString = new TextDecoder().decode(body)
  const data = JSON.parse(jsonString)

  return { version, serializeType, messageType, sequenceId, data }
}

/**
 * 调试用：buffer → hex 字符串
 */
export function bufferToHexString(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}
