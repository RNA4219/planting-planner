import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

declare global {
  // eslint-disable-next-line no-var
  var self: ServiceWorkerGlobalScope
}

const sendTelemetryMock = vi.fn()

vi.mock('../../src/config/pwa', () => ({
  APP_VERSION: 'test-version',
  SCHEMA_VERSION: 'schema',
  DATA_EPOCH: 'epoch',
  SW_FORCE_UPDATE: false,
  buildTelemetryContext: () => ({
    appVersion: 'test-version',
    schemaVersion: 'schema',
    dataEpoch: 'epoch',
  }),
}))

vi.mock('../../src/lib/telemetry', () => ({
  sendTelemetry: sendTelemetryMock,
}))

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
}))

vi.mock('workbox-core', () => ({
  clientsClaim: vi.fn(),
}))

vi.mock('workbox-routing', () => ({
  registerRoute: vi.fn(),
}))

vi.mock('workbox-strategies', () => ({
  NetworkFirst: vi.fn(() => ({})),
  NetworkOnly: vi.fn(() => ({})),
  StaleWhileRevalidate: vi.fn(() => ({})),
}))

vi.mock('workbox-background-sync', () => ({
  BackgroundSyncPlugin: vi.fn(),
}))

vi.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: vi.fn(() => ({})),
}))

vi.mock('workbox-expiration', () => ({
  ExpirationPlugin: vi.fn(() => ({})),
}))

describe('processRefreshQueue telemetry', () => {
  beforeEach(() => {
    vi.resetModules()
    sendTelemetryMock.mockReset()

    globalThis.self = {
      addEventListener: vi.fn(),
      skipWaiting: vi.fn(),
      clients: {
        matchAll: vi.fn(() => Promise.resolve([])),
        claim: vi.fn(),
      },
      registration: {
        waiting: null,
      },
    } as unknown as ServiceWorkerGlobalScope
  })

  afterEach(() => {
    delete globalThis.self
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends failure telemetry when retries are exhausted', async () => {
    const fetchError = new Error('network failed')
    const fetchMock = vi.fn(() => Promise.reject(fetchError))
    const setTimeoutMock = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 0 as unknown as ReturnType<typeof setTimeout>
      })
    vi.stubGlobal('fetch', fetchMock)

    const queueEntry = {
      request: new Request('https://example.test/api/data', {
        headers: { 'x-request-id': 'req-1' },
      }),
    }

    const shiftRequest = vi.fn().mockResolvedValueOnce(queueEntry).mockResolvedValueOnce(undefined)
    const unshiftRequest = vi.fn(() => Promise.resolve())

    const { processRefreshQueue } = await import('../../src/sw')

    await expect(
      processRefreshQueue({
        name: 'refresh-queue',
        shiftRequest,
        unshiftRequest,
      } as unknown as import('workbox-background-sync').Queue),
    ).rejects.toThrow(fetchError)

    expect(unshiftRequest).toHaveBeenCalledWith(queueEntry)
    expect(sendTelemetryMock).toHaveBeenCalledWith(
      'bg.sync.failed',
      { attempt: 3, queue: 'refresh-queue' },
      'req-1',
    )
    setTimeoutMock.mockRestore()
  })

  it('sends success telemetry when queue processes successfully', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    const queueEntry = {
      request: new Request('https://example.test/api/data', {
        headers: { 'x-request-id': 'req-2' },
      }),
    }

    const shiftRequest = vi.fn().mockResolvedValueOnce(queueEntry).mockResolvedValueOnce(undefined)
    const unshiftRequest = vi.fn(() => Promise.resolve())

    const { processRefreshQueue } = await import('../../src/sw')

    await expect(
      processRefreshQueue({
        name: 'refresh-queue',
        shiftRequest,
        unshiftRequest,
      } as unknown as import('workbox-background-sync').Queue),
    ).resolves.toBeUndefined()

    expect(unshiftRequest).not.toHaveBeenCalled()
    expect(sendTelemetryMock).toHaveBeenCalledWith(
      'bg.sync.succeeded',
      { queue: 'refresh-queue' },
      'req-2',
    )
  })
})
