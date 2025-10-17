import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const renderMock = vi.fn()
const createRootMock = vi.fn(() => ({ render: renderMock }))

const registerServiceWorker = vi.fn(async () => undefined)
const startWebVitalsTracking = vi.fn(
  (callback: (task: () => Promise<unknown> | void) => void) => {
    callback(() => Promise.resolve())
  },
)

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock,
}))

vi.mock('../src/lib/swClient', () => ({
  registerServiceWorker,
}))

vi.mock('../src/lib/webVitals', () => ({
  startWebVitalsTracking,
}))

describe('main entrypoint', () => {
  let originalReadyState: PropertyDescriptor | undefined
  let originalQueueMicrotask: typeof queueMicrotask | undefined

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    document.body.innerHTML = '<div id="root"></div>'

    originalReadyState = Object.getOwnPropertyDescriptor(document, 'readyState')
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })

    originalQueueMicrotask = globalThis.queueMicrotask
    globalThis.queueMicrotask = ((callback: () => void) => {
      callback()
    }) as typeof queueMicrotask
  })

  afterEach(() => {
    if (originalReadyState) {
      Object.defineProperty(document, 'readyState', originalReadyState)
    } else {
      delete (document as { readyState?: unknown }).readyState
    }

    if (originalQueueMicrotask) {
      globalThis.queueMicrotask = originalQueueMicrotask
    } else {
      delete (globalThis as { queueMicrotask?: typeof queueMicrotask }).queueMicrotask
    }
  })

  it('initialises without errors and schedules web vitals tracking and service worker', async () => {
    vi.useFakeTimers()

    try {
      await import('../src/main.tsx')

      await Promise.resolve()
      await Promise.resolve()

      expect(createRootMock).toHaveBeenCalledTimes(1)
      expect(startWebVitalsTracking).toHaveBeenCalledTimes(1)
      expect(registerServiceWorker).not.toHaveBeenCalled()

      await vi.runAllTimersAsync()

      expect(registerServiceWorker).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
