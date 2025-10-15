import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  __setPrefetchStoreAdapterForTests,
  clearPrefetchSnapshots,
  loadPrefetchSnapshot,
  savePrefetchSnapshot,
  type PrefetchCounters,
  type PrefetchKey,
  type PrefetchStoreAdapter,
} from '../prefetchStore'
import type { RecommendationFetchResult } from '../../hooks/recommendationFetcher'

const TTL_MS = 1000 * 60 * 60 * 24 * 14

const createKey = ({ region, marketScope, category, week }: PrefetchKey): string =>
  `${region}:${marketScope}:${category}:${week}`

interface MemoryEntry {
  key: PrefetchKey
  result: RecommendationFetchResult['result']
  isMarketFallback: boolean
  fetchedAt: number
  expiresAt: number
}

const createMemoryAdapter = () => {
  const store = new Map<string, MemoryEntry>()
  let counters: PrefetchCounters = { hits: 0, misses: 0 }

  const snapshotOf = (entry: MemoryEntry) => ({
    key: entry.key,
    result: entry.result,
    isMarketFallback: entry.isMarketFallback,
    fetchedAt: entry.fetchedAt,
    expiresAt: entry.expiresAt,
  })

  const pruneExpired = (now: number): number => {
    let removed = 0
    for (const [id, entry] of store) {
      if (entry.expiresAt <= now) {
        store.delete(id)
        removed += 1
      }
    }
    return removed
  }

  const adapter: PrefetchStoreAdapter = {
    async save(input) {
      const now = Date.now()
      const fetchedAt = input.fetchedAt ?? now
      const expiresAt = fetchedAt + TTL_MS
      const pruned = pruneExpired(now)
      const entry = {
        key: { region: input.region, marketScope: input.marketScope, category: input.category, week: input.week },
        result: structuredClone(input.snapshot.result),
        isMarketFallback: input.snapshot.isMarketFallback,
        fetchedAt,
        expiresAt,
      }
      store.set(createKey(input), entry)
      return { counters, pruned }
    },
    async load(key) {
      const entry = store.get(createKey(key))
      const now = Date.now()
      if (entry && entry.expiresAt > now) {
        counters = { hits: counters.hits + 1, misses: counters.misses }
        return { snapshot: snapshotOf(entry), counters }
      }
      if (entry) {
        store.delete(createKey(key))
      }
      counters = { hits: counters.hits, misses: counters.misses + 1 }
      return { snapshot: null, counters }
    },
    async clear() {
      store.clear()
      counters = { hits: 0, misses: 0 }
      return counters
    },
  }
  return adapter
}

const baseKey: PrefetchKey = {
  region: 'temperate',
  marketScope: 'national',
  category: 'leaf',
  week: '2024-W10',
}

beforeEach(() => {
  __setPrefetchStoreAdapterForTests(createMemoryAdapter())
})

afterEach(() => {
  __setPrefetchStoreAdapterForTests(null)
})

describe('prefetchStore', () => {
  it('saves and loads snapshots while tracking hits', async () => {
    const saveResult = await savePrefetchSnapshot({
      ...baseKey,
      snapshot: {
        result: { week: baseKey.week, items: [], source: 'modern' },
        isMarketFallback: false,
      },
    })
    expect(saveResult.counters).toEqual({ hits: 0, misses: 0 })
    const { snapshot, counters } = await loadPrefetchSnapshot(baseKey)
    expect(snapshot?.key).toEqual(baseKey)
    expect(snapshot?.result?.week).toBe(baseKey.week)
    expect(counters).toEqual({ hits: 1, misses: 0 })
  })

  it('evicts expired entries when saving new data', async () => {
    const oldTimestamp = Date.now() - 16 * 24 * 60 * 60 * 1000
    await savePrefetchSnapshot({
      ...baseKey,
      week: '2024-W05',
      snapshot: {
        result: { week: '2024-W05', items: [], source: 'legacy' },
        isMarketFallback: false,
      },
      fetchedAt: oldTimestamp,
    })
    const result = await savePrefetchSnapshot({
      ...baseKey,
      snapshot: {
        result: {
          week: baseKey.week,
          items: [
            {
              crop: 'Lettuce',
              sowing_week: baseKey.week,
              harvest_week: baseKey.week,
              source: 'modern',
              growth_days: 30,
            },
          ],
          source: 'modern',
        },
        isMarketFallback: false,
      },
    })
    expect(result.pruned).toBe(1)
    const miss = await loadPrefetchSnapshot({ ...baseKey, week: '2024-W05' })
    expect(miss.snapshot).toBeNull()
    expect(miss.counters.misses).toBeGreaterThan(0)
  })

  it('increments miss counters when data is unavailable', async () => {
    const miss = await loadPrefetchSnapshot(baseKey)
    expect(miss.snapshot).toBeNull()
    expect(miss.counters).toEqual({ hits: 0, misses: 1 })
  })

  it('clears stored data and resets counters', async () => {
    await savePrefetchSnapshot({
      ...baseKey,
      snapshot: {
        result: { week: baseKey.week, items: [], source: 'modern' },
        isMarketFallback: true,
      },
    })
    await loadPrefetchSnapshot(baseKey)
    const cleared = await clearPrefetchSnapshots()
    expect(cleared).toEqual({ hits: 0, misses: 0 })
    const { counters } = await loadPrefetchSnapshot(baseKey)
    expect(counters).toEqual({ hits: 0, misses: 1 })
  })
})
