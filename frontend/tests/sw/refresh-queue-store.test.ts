import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Store = typeof import('../../src/sw/refreshQueueStore')
const recordEnqueue = vi.fn<Parameters<Store['recordEnqueue']>[0], ReturnType<Store['recordEnqueue']>>().mockResolvedValue(undefined)
const recordAttempt = vi.fn<Parameters<Store['recordAttempt']>[0], ReturnType<Store['recordAttempt']>>().mockResolvedValue(undefined)
const recordSuccess = vi.fn<Parameters<Store['recordSuccess']>[0], ReturnType<Store['recordSuccess']>>().mockResolvedValue(undefined)
const recordFailure = vi.fn<Parameters<Store['recordFailure']>[0], ReturnType<Store['recordFailure']>>().mockResolvedValue(undefined)

let swModule: typeof import('../../src/sw')
const queue = { shiftRequest: vi.fn(), unshiftRequest: vi.fn() }
let queueInstance: {
  pushRequest: ReturnType<typeof vi.fn>
  shiftRequest: typeof queue.shiftRequest
  unshiftRequest: typeof queue.unshiftRequest
} | undefined
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
vi.mock('workbox-background-sync', () => {
  class MockQueue {
    pushRequest = vi.fn().mockResolvedValue(undefined)
    shiftRequest = queue.shiftRequest
    unshiftRequest = queue.unshiftRequest
  }

  class MockBackgroundSyncPlugin {
    _queue: MockQueue
    fetchDidFail: ReturnType<typeof vi.fn>

    constructor(_name: string, _options?: { onSync?: ({ queue }: { queue: unknown }) => Promise<void> | void }) {
      this._queue = new MockQueue()
      queueInstance = this._queue
      this.fetchDidFail = vi.fn(async ({ request }: { request: Request }) => {
        await this._queue.pushRequest({ request })
      })
    }
  }

  return { BackgroundSyncPlugin: MockBackgroundSyncPlugin }
})
vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() })); vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), cleanupOutdatedCaches: vi.fn() }))
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn() }))
vi.mock('workbox-strategies', () => ({ NetworkFirst: vi.fn(), NetworkOnly: vi.fn(), StaleWhileRevalidate: vi.fn() }))
vi.mock('workbox-cacheable-response', () => ({ CacheableResponsePlugin: vi.fn() })); vi.mock('workbox-expiration', () => ({ ExpirationPlugin: vi.fn() }))

describe('refresh background sync plugin', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    queueInstance = undefined
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
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(123)
    await swModule.__workbox.refreshBackgroundSyncPlugin.fetchDidFail?.({ request })
    dateSpy.mockRestore()
    expect(queueInstance).toBeDefined()
    const pushedEntry = queueInstance!.pushRequest.mock.calls[0]?.[0]
    const id = pushedEntry?.metadata?.refreshQueueId as string
    expect(recordEnqueue).toHaveBeenCalledWith({ id, request, timestamp: 123 })
    queue.shiftRequest
      .mockResolvedValueOnce({ request, timestamp: pushedEntry?.timestamp, metadata: { refreshQueueId: id } })
      .mockResolvedValueOnce(undefined)
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    await swModule.processRefreshQueue(queue as never)
    expect(recordAttempt).toHaveBeenCalledWith({ id })
    expect(recordSuccess).toHaveBeenCalledWith({ id })
    expect(recordFailure).not.toHaveBeenCalled()
  })

  it('records failure when replay throws', async () => {
    const request = new Request('https://example.test/api/refresh', { method: 'POST', body: 'fail' })
    const dateSpy = vi.spyOn(Date, 'now')
    dateSpy.mockReturnValueOnce(456)
    await swModule.__workbox.refreshBackgroundSyncPlugin.fetchDidFail?.({ request })
    expect(queueInstance).toBeDefined()
    const pushedEntry = queueInstance!.pushRequest.mock.calls[0]?.[0]
    const id = pushedEntry?.metadata?.refreshQueueId as string
    queue.shiftRequest
      .mockResolvedValueOnce({ request, timestamp: pushedEntry?.timestamp, metadata: { refreshQueueId: id } })
      .mockResolvedValueOnce(undefined)
    const failureTime = 789
    dateSpy.mockReturnValueOnce(failureTime)
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }))
    await expect(swModule.processRefreshQueue(queue as never)).rejects.toThrow('Server error: 500')
    expect(recordAttempt).toHaveBeenCalledWith({ id })
    expect(recordAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      recordFailure.mock.invocationCallOrder[0],
    )
    expect(recordFailure).toHaveBeenCalledWith({
      id,
      error: expect.objectContaining({ message: 'Server error: 500' }),
      timestamp: failureTime,
    })
    expect(queue.unshiftRequest).toHaveBeenCalled()
    dateSpy.mockRestore()
  })
})

afterAll(() => {
  globalThis.fetch = originalFetch
  globalThis.setTimeout = originalSetTimeout
})
