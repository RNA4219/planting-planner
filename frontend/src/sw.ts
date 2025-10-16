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
  buildTelemetryContext,
} from './config/pwa'
import { sendTelemetry } from './lib/telemetry'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

const API_CACHE_NAME = 'api-get-cache'
const STATIC_CACHE_NAME = 'static-assets'
const REFRESH_QUEUE_NAME = 'refresh-queue'
const MAX_BACKGROUND_SYNC_ATTEMPTS = 3

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const versionedCacheKeyPlugin = {
  async cacheKeyWillBeUsed({ request }: { request: Request }) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return url.toString()
    }

    const method = request.method.toLowerCase()
    const serializedQuery = url.search ? url.search : ''

    return `api:${method}:${url.pathname}${serializedQuery}:v${SCHEMA_VERSION}:e${DATA_EPOCH}`
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
      const requestId = request.headers.get('x-request-id') ?? undefined
      const telemetryArgs: Parameters<typeof sendTelemetry> = [
        'sw.fetch.cache_hit',
        {
          cacheName,
          url: request.url,
        },
      ]
      if (requestId) {
        telemetryArgs.push(requestId)
      }

      await sendTelemetry(...telemetryArgs)
    }

    return cachedResponse ?? null
  },
}

const processRequestWithRetries = async (request: Request): Promise<Response | void> => {
  const requestId = request.headers.get('x-request-id') ?? undefined

  for (let attempt = 0; attempt < MAX_BACKGROUND_SYNC_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(request.clone())
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }
      return response
    } catch (error) {
      if (attempt >= MAX_BACKGROUND_SYNC_ATTEMPTS - 1) {
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
    const requestId = entry.request.headers.get('x-request-id') ?? undefined
    try {
      await processRequestWithRetries(entry.request)
      await sendTelemetry('bg.sync.succeeded', { queue: REFRESH_QUEUE_NAME }, requestId)
    } catch (error) {
      await sendTelemetry(
        'bg.sync.failed',
        { attempt: MAX_BACKGROUND_SYNC_ATTEMPTS, queue: REFRESH_QUEUE_NAME },
        requestId,
      )
      await queue.unshiftRequest(entry)
      throw error
    }

    entry = await queue.shiftRequest()
  }
}

const notifyWaitingClients = async () => {
  const waiting = self.registration.waiting
  if (!waiting || waiting.state !== 'installed') {
    return
  }

  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of windowClients) {
    if ('postMessage' in client && typeof client.postMessage === 'function') {
      client.postMessage({ type: 'SW_WAITING', version: APP_VERSION })
    }
  }
}

const refreshBackgroundSyncPlugin = new BackgroundSyncPlugin(REFRESH_QUEUE_NAME, {
  maxRetentionTime: 60 * 24,
  onSync: ({ queue }) => processRefreshQueue(queue),
})

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await sendTelemetry('sw.install', {
        appVersion: APP_VERSION,
      })

      await notifyWaitingClients()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') {
    return
  }

  if ('type' in data && data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
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
