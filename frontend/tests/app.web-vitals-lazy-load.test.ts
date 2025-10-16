import { expect, test, vi } from 'vitest'

const startWebVitalsTracking = vi.fn()
const registerServiceWorker = vi.fn()
const subscribe = vi.fn(() => () => {})
const getSnapshot = vi.fn(() => ({
  waiting: null,
  isOffline: false,
  lastSyncAt: null,
}))

vi.mock('../src/lib/webVitals', () => ({
  startWebVitalsTracking,
}))

vi.mock('../src/lib/swClient', () => ({
  registerServiceWorker,
  subscribe,
  getSnapshot,
}))

test('web vitals tracking is started asynchronously to avoid blocking hydration', async () => {
  document.body.innerHTML = '<div id="root"></div>'

  await import('../src/main')

  expect(startWebVitalsTracking).not.toHaveBeenCalled()

  await Promise.resolve()
  await Promise.resolve()

  expect(startWebVitalsTracking).toHaveBeenCalledTimes(1)
})
