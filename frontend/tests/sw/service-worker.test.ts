import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

declare global {
  // eslint-disable-next-line no-var
  var self: ServiceWorkerGlobalScope
}

const sendTelemetryMock = vi.fn()

vi.mock('../../src/config/pwa', () => ({
  APP_VERSION: '1.2.3',
  SCHEMA_VERSION: '2024-04-01',
  DATA_EPOCH: '2024-04-15T12:00:00Z',
  SW_FORCE_UPDATE: false,
  buildTelemetryContext: () => ({
    appVersion: '1.2.3',
    schemaVersion: '2024-04-01',
    dataEpoch: '2024-04-15T12:00:00Z',
  }),
}))

vi.mock('../../src/lib/telemetry', () => ({
  sendTelemetry: sendTelemetryMock,
}))

const registerRouteMock = vi.fn()
const precacheAndRouteMock = vi.fn()
const cleanupOutdatedCachesMock = vi.fn()
const clientsClaimMock = vi.fn()

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: precacheAndRouteMock,
  cleanupOutdatedCaches: cleanupOutdatedCachesMock,
}))

vi.mock('workbox-core', () => ({
  clientsClaim: clientsClaimMock,
  skipWaiting: vi.fn(),
  setCacheNameDetails: vi.fn(),
}))

const backgroundSyncInstances: unknown[] = []

class MockBackgroundSyncPlugin {
  public readonly name: string

  public readonly config: unknown

  constructor(name: string, config: unknown) {
    this.name = name
    this.config = config
    backgroundSyncInstances.push(this)
  }
}

vi.mock('workbox-background-sync', () => ({
  BackgroundSyncPlugin: MockBackgroundSyncPlugin,
}))

const networkFirstCalls: unknown[] = []
const staleWhileRevalidateCalls: unknown[] = []
const networkOnlyCalls: unknown[] = []

vi.mock('workbox-routing', () => ({
  registerRoute: registerRouteMock,
}))

vi.mock('workbox-strategies', () => ({
  NetworkFirst: vi.fn((options: unknown) => {
    networkFirstCalls.push(options)
    return { type: 'NetworkFirst', options }
  }),
  StaleWhileRevalidate: vi.fn((options: unknown) => {
    staleWhileRevalidateCalls.push(options)
    return { type: 'StaleWhileRevalidate', options }
  }),
  NetworkOnly: vi.fn((options: unknown) => {
    networkOnlyCalls.push(options)
    return { type: 'NetworkOnly', options }
  }),
}))

const cacheableResponsePlugin = { name: 'cacheable-response' }
const expirationPlugin = { name: 'expiration' }

vi.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: vi.fn(() => cacheableResponsePlugin),
}))

vi.mock('workbox-expiration', () => ({
  ExpirationPlugin: vi.fn(() => expirationPlugin),
}))

let installHandler: ((event: ExtendableEvent) => void) | undefined
let messageHandler: ((event: MessageEvent) => void) | undefined
let matchAllMock: ReturnType<typeof vi.fn>
let skipWaitingMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  sendTelemetryMock.mockReset()
  registerRouteMock.mockReset()
  precacheAndRouteMock.mockReset()
  cleanupOutdatedCachesMock.mockReset()
  clientsClaimMock.mockReset()
  backgroundSyncInstances.length = 0
  networkFirstCalls.length = 0
  staleWhileRevalidateCalls.length = 0
  networkOnlyCalls.length = 0

  installHandler = undefined
  messageHandler = undefined
  matchAllMock = vi.fn()
  skipWaitingMock = vi.fn()
  globalThis.self = {
    addEventListener: vi.fn((event, handler) => {
      if (event === 'install') {
        installHandler = handler as (event: ExtendableEvent) => void
      }
      if (event === 'message') {
        messageHandler = handler as (event: MessageEvent) => void
      }
    }),
    skipWaiting: skipWaitingMock,
    clients: {
      claim: vi.fn(),
      matchAll: matchAllMock,
    },
    registration: {
      sync: {
        register: vi.fn(),
      },
      waiting: null,
    },
    location: {
      origin: 'https://example.test',
    },
  } as unknown as ServiceWorkerGlobalScope
})

afterEach(() => {
  delete globalThis.self
})

describe('service worker', () => {
  test('generates versioned cache key for API requests', async () => {
    const module = await import('../../src/sw')
    const { versionedCacheKeyPlugin } = module

    expect(versionedCacheKeyPlugin).toBeDefined()

    const request = new Request('https://example.test/api/list?foo=bar')
    const key = await versionedCacheKeyPlugin.cacheKeyWillBeUsed({
      request,
      mode: 'read',
    })

    expect(key).toBe('api:get:/api/list?foo=bar:v2024-04-01:e2024-04-15T12:00:00Z')
  })

  test('background sync plugin retries with telemetry', async () => {
    const module = await import('../../src/sw')
    const { processRefreshQueue } = module

    expect(backgroundSyncInstances).toHaveLength(1)
    const [plugin] = backgroundSyncInstances as Array<{
      name: string
      config: { maxRetentionTime?: number }
    }>
    expect(plugin.name).toBe('refresh-queue')
    expect(plugin.config).toMatchObject({ maxRetentionTime: 60 * 24 })

    const failedRequest = new Request('https://example.test/api/refresh', {
      method: 'POST',
      headers: new Headers({ 'x-request-id': 'req-1' }),
    })

    const entries = [{ request: failedRequest }]
    const queue = {
      async shiftRequest() {
        return entries.shift()
      },
      async unshiftRequest(entry: { request: Request }) {
        entries.unshift(entry)
      },
      async pushRequest() {
        return undefined
      },
    }

    let attempt = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempt += 1
      if (attempt < 3) {
        throw new Error('network')
      }
      return new Response(null, { status: 204 })
    })

    await processRefreshQueue(queue as never)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(sendTelemetryMock).toHaveBeenCalledWith('bg.sync.retry', { attempt: 1 }, 'req-1')
    expect(sendTelemetryMock).toHaveBeenCalledWith('bg.sync.retry', { attempt: 2 }, 'req-1')
  })

  test('telemetry emitted on cache hit', async () => {
    const module = await import('../../src/sw')
    const { telemetryCachePlugin } = module

    const request = new Request('https://example.test/api/list', {
      headers: new Headers({ 'x-request-id': 'req-123' }),
    })
    const cachedResponse = new Response('{}', { status: 200 })

    const response = await telemetryCachePlugin.cachedResponseWillBeUsed({
      cacheName: 'api-cache',
      request,
      cachedResponse,
    })

    expect(response).toBe(cachedResponse)
    expect(sendTelemetryMock).toHaveBeenCalledWith('sw.fetch.cache_hit', {
      cacheName: 'api-cache',
      url: 'https://example.test/api/list',
    }, 'req-123')
  })

  test('install handler emits telemetry', async () => {
    await import('../../src/sw')

    expect(installHandler).toBeDefined()

    const waitUntil = vi.fn(async (promise: Promise<unknown>) => promise)
    await installHandler?.({
      waitUntil,
    } as unknown as ExtendableEvent)

    const installTask = waitUntil.mock.calls.at(-1)?.[0]
    if (installTask && installTask instanceof Promise) {
      await installTask
    }

    expect(sendTelemetryMock).toHaveBeenCalledWith('sw.install', {
      appVersion: '1.2.3',
    })
  })

  test('install handler notifies existing clients about waiting version', async () => {
    await import('../../src/sw')

    expect(installHandler).toBeDefined()

    const postMessageMock = vi.fn()
    matchAllMock.mockResolvedValue([{ postMessage: postMessageMock }])
    ;(globalThis.self.registration as ServiceWorkerRegistration).waiting =
      { state: 'installed' } as ServiceWorker

    const waitUntil = vi.fn(async (promise: Promise<unknown>) => promise)
    await installHandler?.({
      waitUntil,
    } as unknown as ExtendableEvent)

    const installTask = waitUntil.mock.calls.at(-1)?.[0]
    if (installTask && installTask instanceof Promise) {
      await installTask
    }

    expect(matchAllMock).toHaveBeenCalledWith({ includeUncontrolled: true, type: 'window' })
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SW_WAITING', version: '1.2.3' })
  })

  test('skipWaiting is triggered when SKIP_WAITING message is received', async () => {
    await import('../../src/sw')

    expect(messageHandler).toBeDefined()

    await messageHandler?.({
      data: { type: 'SKIP_WAITING' },
    } as unknown as MessageEvent)

    expect(skipWaitingMock).toHaveBeenCalledTimes(1)
  })
})
