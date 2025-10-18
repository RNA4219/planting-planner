import type { DBSchema, IDBPDatabase } from 'idb'
import { openDB } from 'idb'

export interface RefreshQueueRecord {
  id: string
  url: string
  body: string | null
  headers: Record<string, string>
  createdAt: number
  attempt: number
  lastFailureAt: number | null
  lastFailureMessage: string | null
  failedAt: number | null
  lastError: string | null
}

export interface RefreshQueueStoreAdapter {
  put(record: RefreshQueueRecord): Promise<void>
  get(id: string): Promise<RefreshQueueRecord | undefined>
  delete(id: string): Promise<void>
}

interface RefreshQueueDB extends DBSchema {
  requests: {
    key: string
    value: RefreshQueueRecord
  }
}

const DATABASE_NAME = 'sync-queue'
const STORE_NAME = 'requests'

let dbPromise: Promise<IDBPDatabase<RefreshQueueDB>> | null = null

const getDatabase = () => {
  if (!dbPromise) {
    dbPromise = openDB<RefreshQueueDB>(DATABASE_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }

  return dbPromise
}

const idbAdapter: RefreshQueueStoreAdapter = {
  async put(record) {
    const db = await getDatabase()
    await db.put(STORE_NAME, record)
  },
  async get(id) {
    const db = await getDatabase()
    const record = await db.get(STORE_NAME, id)
    return record ?? undefined
  },
  async delete(id) {
    const db = await getDatabase()
    await db.delete(STORE_NAME, id)
  },
}

let customAdapter: RefreshQueueStoreAdapter | null = null

const getAdapter = () => customAdapter ?? idbAdapter

export const setRefreshQueueStoreAdapter = (adapter: RefreshQueueStoreAdapter | null) => {
  customAdapter = adapter
}

const serializeHeaders = (headers: Headers): Record<string, string> => {
  const serialized: Record<string, string> = {}
  headers.forEach((value, key) => {
    serialized[key] = value
  })
  return serialized
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64')
  }

  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

const serializeRequestBody = async (request: Request): Promise<string | null> => {
  const clone = request.clone()
  if (clone.method === 'GET' || clone.method === 'HEAD') {
    return null
  }

  try {
    const buffer = await clone.arrayBuffer()
    if (buffer.byteLength === 0) {
      return null
    }

    return arrayBufferToBase64(buffer)
  } catch {
    return null
  }
}

export const recordEnqueue = async ({
  id,
  request,
  timestamp = Date.now(),
}: {
  id: string
  request: Request
  timestamp?: number
}) => {
  const adapter = getAdapter()
  const [body, headers] = await Promise.all([
    serializeRequestBody(request),
    Promise.resolve(serializeHeaders(request.headers)),
  ])

  const record: RefreshQueueRecord = {
    id,
    url: request.url,
    body,
    headers,
    createdAt: timestamp,
    attempt: 0,
    lastFailureAt: null,
    lastFailureMessage: null,
    failedAt: null,
    lastError: null,
  }

  await adapter.put(record)
}

export const recordAttempt = async ({ id }: { id: string }) => {
  const adapter = getAdapter()
  const record = await adapter.get(id)

  if (!record) {
    return
  }

  await adapter.put({
    ...record,
    attempt: record.attempt + 1,
  })
}

export const recordSuccess = async ({ id }: { id: string }) => {
  const adapter = getAdapter()
  await adapter.delete(id)
}

export const recordFailure = async ({
  id,
  timestamp = Date.now(),
  error,
}: {
  id: string
  timestamp?: number
  error?: unknown
}) => {
  const adapter = getAdapter()
  const record = await adapter.get(id)

  if (!record) {
    return
  }

  const errorMessage = error instanceof Error ? error.message : error == null ? null : String(error)

  await adapter.put({
    ...record,
    lastFailureAt: timestamp,
    lastFailureMessage: errorMessage,
    failedAt: timestamp,
    lastError: errorMessage,
  })
}
