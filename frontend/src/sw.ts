import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import type { Queue } from 'workbox-background-sync'

import {
  APP_VERSION,
  DATA_EPOCH,
  SCHEMA_VERSION,
  SW_FORCE_UPDATE,
  buildTelemetryContext,
} from './config/pwa'
import { sendTelemetry } from './lib/telemetry'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

const API_CACHE_NAME = 'api-get-cache'
const STATIC_CACHE_NAME = 'static-assets'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const versionedCacheKeyPlugin = {
  async cacheKeyWillBeUsed({ request }: { request: Request }) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return url.toString()
    }

    url.searchParams.set('schema', SCHEMA_VERSION)
    url.searchParams.set('epoch', DATA_EPOCH)

    return url.toString()
  },
}

export const telemetryCachePlugin = {
  async cachedResponseWillBeUsed({
    cacheName,
    request,
    cachedResponse,
  }: {
    cacheName: string
    request: Request
    cachedResponse?: Response | null
  }) {
    if (cachedResponse) {
      await sendTelemetry('sw.fetch.cache_hit', {
        cacheName,
        url: request.url,
      })
    }

    return cachedResponse ?? null
  },
}

const processRequestWithRetries = async (request: Request): Promise<Response | void> => {
  const requestId = request.headers.get('x-request-id') ?? undefined

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(request.clone())
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }
      return response
    } catch (error) {
      if (attempt >= 2) {
        throw error
      }
      const nextAttempt = attempt + 1
      await sendTelemetry('bg.sync.retry', { attempt: nextAttempt }, requestId)
      await delay(2 ** attempt * 200)
    }
  }
}

export const processRefreshQueue = async (queue: Queue) => {
  let entry = await queue.shiftRequest()

  while (entry) {
    try {
      await processRequestWithRetries(entry.request)
    } catch (error) {
      await queue.unshiftRequest(entry)
      throw error
    }

    entry = await queue.shiftRequest()
  }
}

const refreshBackgroundSyncPlugin = new BackgroundSyncPlugin('refresh-api', {
  maxRetentionTime: 60 * 24,
  onSync: ({ queue }) => processRefreshQueue(queue),
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (SW_FORCE_UPDATE) {
        self.skipWaiting()
      }

      await sendTelemetry('sw.install', {
        appVersion: APP_VERSION,
      })
    })(),
  )
})

registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'worker' ||
    request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24,
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    networkTimeoutSeconds: 5,
    plugins: [
      versionedCacheKeyPlugin,
      telemetryCachePlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60,
        purgeOnQuotaError: true,
      }),
    ],
    fetchOptions: {
      credentials: 'include',
    },
  }),
)

registerRoute(
  ({ url, request }) => request.method === 'POST' && url.pathname === '/api/refresh',
  new NetworkOnly({
    plugins: [refreshBackgroundSyncPlugin],
  }),
  'POST',
)

export const __workbox = {
  refreshBackgroundSyncPlugin,
  telemetryContext: buildTelemetryContext(),
}
