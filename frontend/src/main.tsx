import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'

const scheduleAfterIdle = (callback: () => void) => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
    cancelIdleCallback?: (handle: number) => void
  }

  let didRun = false
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  const runOnce = () => {
    if (didRun) {
      return
    }
    didRun = true
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
    }
    callback()
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    const idleHandle = globalWithIdle.requestIdleCallback(() => {
      runOnce()
    })

    timeoutHandle = setTimeout(() => {
      if (typeof globalWithIdle.cancelIdleCallback === 'function') {
        globalWithIdle.cancelIdleCallback(idleHandle)
      }
      runOnce()
    }, 0)

    return
  }

  if (typeof globalThis.queueMicrotask === 'function') {
    globalThis.queueMicrotask(runOnce)

    timeoutHandle = setTimeout(() => {
      runOnce()
    }, 0)

    return
  }

  void Promise.resolve().then(runOnce)
}

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

setTimeout(() => {
  startWebVitalsTracking()
}, 0)


let serviceWorkerRegistrationScheduled = false

const scheduleServiceWorkerRegistration = () => {
  if (serviceWorkerRegistrationScheduled) {
    return
  }
  serviceWorkerRegistrationScheduled = true

  scheduleAfterIdle(() => {
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
