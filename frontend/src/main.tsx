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

    timeoutHandle = setTimeout(() => {
      runQueue()
    }, 0)
  }
})()

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

let serviceWorkerRegistrationScheduled = false

const scheduleServiceWorkerRegistration = () => {
  if (serviceWorkerRegistrationScheduled) {
    return
  }
  serviceWorkerRegistrationScheduled = true

  scheduleAfterIdle(() => {
    void import('./lib/webVitals').then(({ startWebVitalsTracking }) => {
      startWebVitalsTracking()
    })

    void registerServiceWorker()
  })
}

if (document.readyState === 'complete') {
  scheduleServiceWorkerRegistration()
} else {
  window.addEventListener(
    'load',
    () => {
      scheduleServiceWorkerRegistration()
    },
    { once: true },
  )
}
