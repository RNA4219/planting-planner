import { buildTelemetryContext } from '../config/pwa'
import { track } from './telemetry'

export type ServiceWorkerClientEvent =
  | {
      readonly type: 'waiting'
      readonly registration: ServiceWorkerRegistration
      readonly forceUpdate: boolean
    }
  | { readonly type: 'waiting-cleared' }
  | { readonly type: 'offline'; readonly isOffline: boolean }
  | { readonly type: 'last-sync'; readonly lastSyncAt: string | null }

export type ServiceWorkerSnapshot = {
  readonly waiting: ServiceWorker | null
  readonly isOffline: boolean
  readonly lastSyncAt: string | null
}

type Listener = (event: ServiceWorkerClientEvent) => void

const listeners = new Set<Listener>()

const state: {
  waiting: ServiceWorker | null
  isOffline: boolean
  lastSyncAt: string | null
  initialized: boolean
  pendingReload: boolean
} = {
  waiting: null,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  lastSyncAt: null,
  initialized: false,
  pendingReload: false,
}

const notify = (event: ServiceWorkerClientEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch {
      // ignore listener failure
    }
  })
}

export const isForceUpdateEnabled = () => {
  const envValue =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SW_FORCE_UPDATE : undefined
  if (typeof envValue === 'string') {
    return envValue === 'true'
  }
  if (typeof (globalThis as Record<string, unknown>).SW_FORCE_UPDATE === 'boolean') {
    return Boolean((globalThis as Record<string, unknown>).SW_FORCE_UPDATE)
  }
  return false
}

const attachRegistrationListeners = (registration: ServiceWorkerRegistration) => {
  if (registration.waiting) {
    state.waiting = registration.waiting
    state.pendingReload = false
    notify({ type: 'waiting', registration, forceUpdate: isForceUpdateEnabled() })
  }
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) {
      return
    }
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        state.waiting = installing
        state.pendingReload = false
        notify({ type: 'waiting', registration, forceUpdate: isForceUpdateEnabled() })
      }
    })
  })
}

const handleOfflineChange = () => {
  const nextOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false
  if (state.isOffline === nextOffline) {
    return
  }
  state.isOffline = nextOffline
  notify({ type: 'offline', isOffline: nextOffline })
}

const handleMessage = (event: MessageEvent) => {
  const data = event.data
  if (!data || typeof data !== 'object') {
    return
  }
  const record = data as Record<string, unknown>
  const type = record.type

  if (type === 'SW_WAITING') {
    const version = typeof record.version === 'string' ? record.version : undefined
    void track('sw.waiting', version ? { version } : {})
    if (state.waiting) {
      notify({
        type: 'waiting',
        registration: { waiting: state.waiting } as ServiceWorkerRegistration,
        forceUpdate: isForceUpdateEnabled(),
      })
    }
    return
  }

  if (type === 'LAST_SYNC' && 'lastSyncAt' in record) {
    const value = typeof record.lastSyncAt === 'string' ? record.lastSyncAt : null
    state.lastSyncAt = value
    notify({ type: 'last-sync', lastSyncAt: value })
  }
}

export const registerServiceWorker = async () => {
  if (state.initialized) {
    return
  }
  state.initialized = true
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  if ('webdriver' in navigator && navigator.webdriver) {
    return
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    attachRegistrationListeners(registration)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    void track('sw.register.failed', {
      error: message,
      telemetryContext: buildTelemetryContext(),
    })
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    state.waiting = null
    if (state.pendingReload) {
      state.pendingReload = false
      try {
        window.location.reload()
      } catch {
        // ignore reload failures
      }
    }
    notify({ type: 'waiting-cleared' })
  })
  navigator.serviceWorker.addEventListener('message', handleMessage)
  window.addEventListener('online', handleOfflineChange)
  window.addEventListener('offline', handleOfflineChange)
  handleOfflineChange()
}

export const subscribe = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getSnapshot = (): ServiceWorkerSnapshot => ({
  waiting: state.waiting,
  isOffline: state.isOffline,
  lastSyncAt: state.lastSyncAt,
})

export const skipWaiting = () => {
  try {
    state.waiting?.postMessage({ type: 'SKIP_WAITING' })
  } catch {
    // ignore
  }
  if (state.waiting && !state.pendingReload) {
    state.pendingReload = true
  }
  state.waiting = null
  notify({ type: 'waiting-cleared' })
}

export const setLastSync = (lastSyncAt: string | null) => {
  state.lastSyncAt = lastSyncAt
  notify({ type: 'last-sync', lastSyncAt })
}
