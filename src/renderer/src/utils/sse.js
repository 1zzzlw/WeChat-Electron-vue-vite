function parseSSEBlock(rawEvent) {
  let eventName = 'message'
  const dataLines = []

  for (const line of rawEvent.split('\n')) {
    if (!line || line.startsWith(':')) continue

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)

    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') {
      eventName = value
    } else if (field === 'data') {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) return null

  return {
    event: eventName,
    data: dataLines.join('\n')
  }
}

function extractSSEEvents(buffer, flush = false) {
  let remaining = buffer.replace(/\r\n/g, '\n')
  const events = []

  let boundaryIndex = remaining.indexOf('\n\n')
  while (boundaryIndex !== -1) {
    const rawEvent = remaining.slice(0, boundaryIndex)
    remaining = remaining.slice(boundaryIndex + 2)

    if (rawEvent.trim()) {
      const event = parseSSEBlock(rawEvent)
      if (event) events.push(event)
    }

    boundaryIndex = remaining.indexOf('\n\n')
  }

  if (flush && remaining.trim()) {
    const event = parseSSEBlock(remaining)
    if (event) events.push(event)
    remaining = ''
  }

  return { events, remaining }
}

export async function* readSSE(response) {
  if (!response.body) throw new Error('当前环境不支持流式响应')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let streamEnded = false

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        streamEnded = true
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const result = extractSSEEvents(buffer)
      buffer = result.remaining

      for (const event of result.events) yield event
    }

    buffer += decoder.decode()
    const result = extractSSEEvents(buffer, true)

    for (const event of result.events) yield event
  } finally {
    if (!streamEnded) await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
