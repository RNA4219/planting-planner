import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'

const scheduleAfterIdle = (() => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
    cancelIdleCallback?: (handle: number) => void
  }

  let queue: Array<() => void> = []
  let scheduled = false
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  let idleHandle: number | undefined

  const runQueue = () => {
    if (!scheduled) {
      return
    }

    scheduled = false

    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
      timeoutHandle = undefined
    }

    const tasks = queue
    queue = []

    for (const task of tasks) {
      task()
    }
  }

  return (callback: () => void) => {
    queue.push(callback)

    if (scheduled) {
      return
    }
    scheduled = true

    if (typeof globalWithIdle.requestIdleCallback === 'function') {
      idleHandle = globalWithIdle.requestIdleCallback(() => {
        idleHandle = undefined
        runQueue()
      })

      timeoutHandle = setTimeout(() => {
        if (idleHandle !== undefined && typeof globalWithIdle.cancelIdleCallback === 'function') {
          globalWithIdle.cancelIdleCallback(idleHandle)
          idleHandle = undefined
        }
        runQueue()
      }, 0)

      return
    }

    if (typeof globalThis.queueMicrotask === 'function') {
      globalThis.queueMicrotask(() => {
        runQueue()
      })
      return
    }

    timeoutHandle = setTimeout(() => {
      runQueue()
    }, 0)
  }
})()

let serviceWorkerRegistrationScheduled = false

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root element not found')
}

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

function scheduleWebVitalsTracking(): void {
  void import('./lib/webVitals').then((module) => {
    const startWebVitalsTracking = module.startWebVitalsTracking

    startWebVitalsTracking((task) => {
      queueMicrotask(() => {
        void task()
      })
    })
  })
}

const scheduleServiceWorkerRegistration = () => {
  if (serviceWorkerRegistrationScheduled) {
    return
  }
  serviceWorkerRegistrationScheduled = true

  scheduleWebVitalsTracking()

  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    scheduleAfterIdle(() => {
      void registerServiceWorker()
    })
    return
  }

  setTimeout(() => {
    void registerServiceWorker()
  }, 0)
}

if (document.readyState === 'complete') {
  scheduleServiceWorkerRegistration()
} else {
  window.addEventListener('load', scheduleServiceWorkerRegistration, { once: true })
}
