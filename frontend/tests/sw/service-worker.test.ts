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
  globalThis.self = {
    addEventListener: vi.fn((event, handler) => {
      if (event === 'install') {
        installHandler = handler as (event: ExtendableEvent) => void
      }
    }),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    registration: {
      sync: {
        register: vi.fn(),
      },
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

    expect(key).toContain('schema=2024-04-01')
    expect(key).toContain(`epoch=${encodeURIComponent('2024-04-15T12:00:00Z')}`)
    expect(key).toContain('foo=bar')
  })

  test('background sync plugin retries with telemetry', async () => {
    const module = await import('../../src/sw')
    const { processRefreshQueue } = module

    expect(backgroundSyncInstances).toHaveLength(1)
    const [plugin] = backgroundSyncInstances as Array<{
      name: string
      config: { maxRetentionTime?: number }
    }>
    expect(plugin.name).toBe('refresh-api')
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

    const request = new Request('https://example.test/api/list')
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
    })
  })

  test('install handler emits telemetry', async () => {
    await import('../../src/sw')

    expect(installHandler).toBeDefined()

    const waitUntil = vi.fn(async (promise: Promise<unknown>) => promise)
    await installHandler?.({
      waitUntil,
    } as unknown as ExtendableEvent)

    expect(sendTelemetryMock).toHaveBeenCalledWith('sw.install', {
      appVersion: '1.2.3',
    })
  })
})
