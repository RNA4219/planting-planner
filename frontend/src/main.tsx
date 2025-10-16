import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'

const isTestEnvironment = import.meta.env?.MODE === 'test'

const scheduleAfterIdle = (callback: () => void) => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
    cancelIdleCallback?: (handle: number) => void
  }

  let executed = false
  const run = () => {
    if (executed) {
      return
    }
    executed = true
    callback()
  }

  let timeoutId: number | undefined

  const runCallback = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timeoutId = undefined
    }
    callback()
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined
    const idleHandle = globalWithIdle.requestIdleCallback(() => {
      if (fallbackTimeout !== undefined) {
        clearTimeout(fallbackTimeout)
      }
      run()
    })

    fallbackTimeout = setTimeout(() => {
      if (typeof globalWithIdle.cancelIdleCallback === 'function') {
        globalWithIdle.cancelIdleCallback(idleHandle)
      }
      run()
    }, 0)

    return
  }

  setTimeout(run, 0)
}

const scheduleAfterWindowLoad = (callback: () => void) => {
  if (document.readyState === 'complete') {
    callback()
    return
  }

  const onLoad = () => {
    window.removeEventListener('load', onLoad)
    callback()
  }

  window.addEventListener('load', onLoad)
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

scheduleAfterWindowLoad(() => {
  scheduleAfterIdle(() => {
    void registerServiceWorker()

    void import('./lib/webVitals').then(({ startWebVitalsTracking }) => {
      startWebVitalsTracking()
    })
  })
})
