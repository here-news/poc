const USER_ID_STORAGE_KEY = 'hn4_user_id'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const generateRandomSegment = () => Math.random().toString(16).slice(2, 6)

export const generateUserId = (): string => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    if (typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint8Array(16)
      crypto.getRandomValues(buffer)

      buffer[6] = (buffer[6] & 0x0f) | 0x40
      buffer[8] = (buffer[8] & 0x3f) | 0x80

      const hex = Array.from(buffer, (b) => b.toString(16).padStart(2, '0'))
      return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join('')
      ].join('-')
    }
  }

  return `${generateRandomSegment()}${generateRandomSegment()}-${generateRandomSegment()}-${generateRandomSegment()}-${generateRandomSegment()}-${generateRandomSegment()}${generateRandomSegment()}`
}

export const persistUserId = (id: string) => {
  if (!id) return
  try {
    localStorage.setItem(USER_ID_STORAGE_KEY, id)
  } catch (err) {
    console.error('Unable to persist user ID', err)
  }
}

export const ensureUserId = (): string => {
  try {
    const stored = localStorage.getItem(USER_ID_STORAGE_KEY) || ''
    if (UUID_REGEX.test(stored)) {
      return stored
    }
  } catch (err) {
    console.error('Unable to access localStorage for user ID', err)
    return generateUserId()
  }

  const newId = generateUserId()
  persistUserId(newId)
  return newId
}

export const formatUserId = (id: string) => id.replace(/[^0-9a-z]/gi, '').slice(0, 8)

export const composeUserHeaders = (userId: string, extra?: HeadersInit): HeadersInit | undefined => {
  if (!userId) {
    return extra
  }

  if (!extra) {
    return { 'X-User-Id': userId }
  }

  if (extra instanceof Headers) {
    const combined = new Headers(extra)
    combined.set('X-User-Id', userId)
    return combined
  }

  if (Array.isArray(extra)) {
    return [...extra, ['X-User-Id', userId]]
  }

  return { ...extra, 'X-User-Id': userId }
}

export { USER_ID_STORAGE_KEY }
