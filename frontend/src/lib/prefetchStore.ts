import type { CropCategory, MarketScope, Region } from '../types'
import type { RecommendationFetchResult } from '../hooks/recommendationFetcher'

const DB_NAME = 'prefetch'
const DB_VERSION = 1
const STORE_NAME = 'recommendations'
const META_STORE = 'meta'
const STATS_KEY = 'stats'
const TTL_MS = 1000 * 60 * 60 * 24 * 14

export interface PrefetchKey {
  readonly region: Region
  readonly marketScope: MarketScope
  readonly category: CropCategory
  readonly week: string
}

export interface PrefetchSnapshot {
  readonly key: PrefetchKey
  readonly result: RecommendationFetchResult['result']
  readonly isMarketFallback: boolean
  readonly fetchedAt: number
  readonly expiresAt: number
}

export interface PrefetchCounters {
  readonly hits: number
  readonly misses: number
}

export interface SavePrefetchSnapshotInput extends PrefetchKey {
  readonly snapshot: {
    readonly result: RecommendationFetchResult['result']
    readonly isMarketFallback: boolean
  }
  readonly fetchedAt?: number
}

export interface SavePrefetchSnapshotResult {
  readonly counters: PrefetchCounters
  readonly pruned: number
}

export interface PrefetchLoadResult {
  readonly snapshot: PrefetchSnapshot | null
  readonly counters: PrefetchCounters
}

interface StoredEntry extends PrefetchSnapshot {
  readonly keyValue: string
}

const DEFAULT_COUNTERS: PrefetchCounters = { hits: 0, misses: 0 }

export interface PrefetchStoreAdapter {
  save(input: SavePrefetchSnapshotInput): Promise<SavePrefetchSnapshotResult>
  load(key: PrefetchKey): Promise<PrefetchLoadResult>
  clear(): Promise<PrefetchCounters>
}

let adapterOverride: PrefetchStoreAdapter | null = null

export const __setPrefetchStoreAdapterForTests = (adapter: PrefetchStoreAdapter | null): void => {
  adapterOverride = adapter
}

const createKey = ({ region, marketScope, category, week }: PrefetchKey): string =>
  `${region}:${marketScope}:${category}:${week}`

const openDatabase = async (): Promise<IDBDatabase | null> => {
  if (!('indexedDB' in globalThis) || !globalThis.indexedDB) {
    return null
  }
  return await new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'keyValue' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

const promisify = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })

const awaitTransaction = (tx: IDBTransaction): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })

const readCounters = async (db: IDBDatabase): Promise<PrefetchCounters> => {
  const tx = db.transaction(META_STORE, 'readonly')
  const store = tx.objectStore(META_STORE)
  const stored = await promisify<PrefetchCounters | undefined>(store.get(STATS_KEY))
  await awaitTransaction(tx)
  return stored ?? DEFAULT_COUNTERS
}

const writeCounters = async (
  db: IDBDatabase,
  updater: (current: PrefetchCounters) => PrefetchCounters,
): Promise<PrefetchCounters> => {
  const tx = db.transaction(META_STORE, 'readwrite')
  const store = tx.objectStore(META_STORE)
  const current = (await promisify<PrefetchCounters | undefined>(store.get(STATS_KEY))) ?? DEFAULT_COUNTERS
  const next = updater(current)
  await promisify(store.put(next, STATS_KEY))
  await awaitTransaction(tx)
  return next
}

const mapEntry = (entry: StoredEntry): PrefetchSnapshot => ({
  key: entry.key,
  result: entry.result,
  isMarketFallback: entry.isMarketFallback,
  fetchedAt: entry.fetchedAt,
  expiresAt: entry.expiresAt,
})

const saveViaIndexedDb = async (
  input: SavePrefetchSnapshotInput,
): Promise<SavePrefetchSnapshotResult> => {
  const db = await openDatabase()
  if (!db) {
    return { counters: DEFAULT_COUNTERS, pruned: 0 }
  }
  const now = Date.now()
  const fetchedAt = input.fetchedAt ?? now
  const expiresAt = fetchedAt + TTL_MS
  const keyValue = createKey(input)
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const entries = await promisify<StoredEntry[]>(store.getAll())
  let pruned = 0
  for (const entry of entries) {
    if (entry.expiresAt <= now) {
      await promisify(store.delete(entry.keyValue))
      pruned += 1
    }
  }
  const record: StoredEntry = {
    key: {
      region: input.region,
      marketScope: input.marketScope,
      category: input.category,
      week: input.week,
    },
    keyValue,
    result: input.snapshot.result,
    isMarketFallback: input.snapshot.isMarketFallback,
    fetchedAt,
    expiresAt,
  }
  await promisify(store.put(record))
  await awaitTransaction(tx)
  const counters = await readCounters(db)
  db.close()
  return { counters, pruned }
}

const loadViaIndexedDb = async (key: PrefetchKey): Promise<PrefetchLoadResult> => {
  const db = await openDatabase()
  if (!db) {
    return { snapshot: null, counters: DEFAULT_COUNTERS }
  }
  const keyValue = createKey(key)
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const entry = await promisify<StoredEntry | undefined>(store.get(keyValue))
  await awaitTransaction(tx)
  const now = Date.now()
  if (entry && entry.expiresAt > now) {
    const counters = await writeCounters(db, (current) => ({
      hits: current.hits + 1,
      misses: current.misses,
    }))
    db.close()
    return { snapshot: mapEntry(entry), counters }
  }
  if (entry) {
    const cleanTx = db.transaction(STORE_NAME, 'readwrite')
    const cleanStore = cleanTx.objectStore(STORE_NAME)
    await promisify(cleanStore.delete(keyValue))
    await awaitTransaction(cleanTx)
  }
  const counters = await writeCounters(db, (current) => ({
    hits: current.hits,
    misses: current.misses + 1,
  }))
  db.close()
  return { snapshot: null, counters }
}

const clearViaIndexedDb = async (): Promise<PrefetchCounters> => {
  const db = await openDatabase()
  if (!db) {
    return DEFAULT_COUNTERS
  }
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await promisify(store.clear())
  await awaitTransaction(tx)
  const counters = await writeCounters(db, () => DEFAULT_COUNTERS)
  db.close()
  return counters
}

export const savePrefetchSnapshot = async (
  input: SavePrefetchSnapshotInput,
): Promise<SavePrefetchSnapshotResult> => {
  if (adapterOverride) {
    return adapterOverride.save(input)
  }
  return saveViaIndexedDb(input)
}

export const loadPrefetchSnapshot = async (
  key: PrefetchKey,
): Promise<PrefetchLoadResult> => {
  if (adapterOverride) {
    return adapterOverride.load(key)
  }
  return loadViaIndexedDb(key)
}

export const clearPrefetchSnapshots = async (): Promise<PrefetchCounters> => {
  if (adapterOverride) {
    return adapterOverride.clear()
  }
  return clearViaIndexedDb()
}
