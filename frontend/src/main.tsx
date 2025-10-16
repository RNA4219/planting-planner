import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'
import { startWebVitalsTracking } from './lib/webVitals'

const scheduleAfterIdle = (callback: () => void) => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    globalWithIdle.requestIdleCallback(() => {
      callback()
    })
    return
  }

  setTimeout(callback, 0)
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

startWebVitalsTracking()
scheduleAfterIdle(() => {
  void registerServiceWorker()
})
