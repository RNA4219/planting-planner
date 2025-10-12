import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { AppProviders } from './AppProviders'

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root element not found')
}

createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)
