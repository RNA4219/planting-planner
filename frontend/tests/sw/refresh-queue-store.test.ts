import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Store = typeof import('../../src/sw/refreshQueueStore')
const recordEnqueue = vi.fn<Parameters<Store['recordEnqueue']>[0], ReturnType<Store['recordEnqueue']>>().mockResolvedValue(undefined)
const recordAttempt = vi.fn<Parameters<Store['recordAttempt']>[0], ReturnType<Store['recordAttempt']>>().mockResolvedValue(undefined)
const recordSuccess = vi.fn<Parameters<Store['recordSuccess']>[0], ReturnType<Store['recordSuccess']>>().mockResolvedValue(undefined)
const recordFailure = vi.fn<Parameters<Store['recordFailure']>[0], ReturnType<Store['recordFailure']>>().mockResolvedValue(undefined)

let callbacks: Record<string, ((...args: any[]) => unknown) | undefined> | undefined
let swModule: typeof import('../../src/sw')
const queue = { shiftRequest: vi.fn(), unshiftRequest: vi.fn() }
const fetchMock = vi.fn()
const originalFetch = globalThis.fetch
const originalSetTimeout = globalThis.setTimeout

vi.mock('../../src/sw/refreshQueueStore', () => ({
  recordEnqueue,
  recordAttempt,
  recordSuccess,
  recordFailure,
}))
vi.mock('../../src/sw/lib/telemetry', () => ({ sendTelemetry: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../src/sw/config/pwa', () => ({
  APP_VERSION: 'test-version',
  DATA_EPOCH: '1',
  SCHEMA_VERSION: '1',
  buildTelemetryContext: vi.fn(),
}))
vi.mock('workbox-background-sync', () => ({
  BackgroundSyncPlugin: vi.fn().mockImplementation((_name, options) => {
    callbacks = options?.callbacks
    return {}
  }),
}))
vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() })); vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), cleanupOutdatedCaches: vi.fn() }))
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn() }))
vi.mock('workbox-strategies', () => ({ NetworkFirst: vi.fn(), NetworkOnly: vi.fn(), StaleWhileRevalidate: vi.fn() }))
vi.mock('workbox-cacheable-response', () => ({ CacheableResponsePlugin: vi.fn() })); vi.mock('workbox-expiration', () => ({ ExpirationPlugin: vi.fn() }))

describe('refresh background sync plugin', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    callbacks = undefined
    queue.shiftRequest.mockReset()
    queue.unshiftRequest.mockReset().mockResolvedValue(undefined)
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as typeof globalThis.fetch
    globalThis.setTimeout = (((cb: Parameters<typeof setTimeout>[0]) => {
      if (typeof cb === 'function') cb()
      return 0 as unknown as ReturnType<typeof setTimeout>
    }) as unknown) as typeof setTimeout
    ;(globalThis as any).self = {
      __WB_MANIFEST: [],
      addEventListener: vi.fn(),
      clients: { matchAll: vi.fn().mockResolvedValue([]) },
      registration: { waiting: null },
      skipWaiting: vi.fn(),
      crypto: globalThis.crypto,
    }
    swModule = await import('../../src/sw')
    globalThis.setTimeout = originalSetTimeout
  })

  it('records queue lifecycle events on success', async () => {
    const request = new Request('https://example.test/api/refresh', { method: 'POST', body: 'ok' })
    const entry = { request, timestamp: 123, metadata: {} as { refreshQueueId?: string } }
    await callbacks?.requestWillEnqueue?.({ entry })
    const id = entry.metadata?.refreshQueueId as string
    expect(recordEnqueue).toHaveBeenCalledWith({ id, request, timestamp: 123 })
    await callbacks?.requestWillReplay?.({ entry })
    expect(recordAttempt).toHaveBeenCalledWith({ id })
    queue.shiftRequest
      .mockResolvedValueOnce({ request, timestamp: 123, metadata: { refreshQueueId: id } })
      .mockResolvedValueOnce(undefined)
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    await swModule.processRefreshQueue(queue as never)
    expect(recordSuccess).toHaveBeenCalledWith({ id })
    expect(recordFailure).not.toHaveBeenCalled()
  })

  it('records failure when replay throws', async () => {
    const request = new Request('https://example.test/api/refresh', { method: 'POST', body: 'fail' })
    const entry = { request, timestamp: 456, metadata: {} as { refreshQueueId?: string } }
    await callbacks?.requestWillEnqueue?.({ entry })
    const id = entry.metadata?.refreshQueueId as string
    queue.shiftRequest
      .mockResolvedValueOnce({ request, timestamp: 456, metadata: { refreshQueueId: id } })
      .mockResolvedValueOnce(undefined)
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }))
    await expect(swModule.processRefreshQueue(queue as never)).rejects.toThrow('Server error: 500')
    expect(recordFailure).toHaveBeenCalledWith({ id })
    expect(queue.unshiftRequest).toHaveBeenCalled()
  })
})

afterAll(() => {
  globalThis.fetch = originalFetch
  globalThis.setTimeout = originalSetTimeout
})
