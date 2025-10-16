import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

const renderMock = vi.fn()

type IdleCallback = (deadline: { readonly didTimeout: boolean; timeRemaining(): number }) => void

vi.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: renderMock,
  }),
}))

afterEach(() => {
  vi.doUnmock('./lib/swClient')
  vi.doUnmock('./lib/webVitals')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  setDocumentReadyState('complete')
})

const setDocumentReadyState = (state: DocumentReadyState) => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: state,
  })
}

const resetMainModule = () => {
  vi.resetModules()
  renderMock.mockClear()
  document.body.innerHTML = '<div id="root"></div>'
  setDocumentReadyState('complete')
}

const mockServiceWorkerModules = () => {
  const registerServiceWorker = vi.fn().mockResolvedValue(undefined)
  const startWebVitalsTracking = vi.fn()

  vi.doMock('./lib/swClient', () => ({ registerServiceWorker }))
  vi.doMock('./lib/webVitals', () => ({ startWebVitalsTracking }))

  return { registerServiceWorker, startWebVitalsTracking }
}

describe('main entrypoint', () => {
  it('renders App within QueryClientProvider', async () => {
    resetMainModule()

    await import('./main')

    expect(renderMock).toHaveBeenCalledTimes(1)
    const element = renderMock.mock.calls[0]?.[0]
    expect(elementContainsQueryClientProvider(element)).toBe(true)
  })

  it('imports global styles', async () => {
    resetMainModule()

    const cssImport = vi.fn()
    vi.doMock('./index.css', () => {
      cssImport()
      return { default: undefined }
    })

    await import('./main')

    expect(cssImport).toHaveBeenCalledTimes(1)
    vi.doUnmock('./index.css')
  })

  it('サービスワーカー登録をアイドル時まで遅延する', async () => {
    vi.resetModules()
    renderMock.mockClear()
    document.body.innerHTML = '<div id="root"></div>'

    const registerMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    vi.doMock('./lib/swClient', () => ({
      registerServiceWorker: registerMock,
    }))

    const requestIdleCallbackSpy = vi.fn<(callback: IdleCallback) => void>()
    vi.stubGlobal('requestIdleCallback', (callback: IdleCallback) => {
      requestIdleCallbackSpy(callback)
      return 1
    })

    const { registerServiceWorker } = mockServiceWorkerModules()

    await import('./main')

    expect(requestIdleCallbackSpy).toHaveBeenCalledTimes(1)
    expect(registerServiceWorker).not.toHaveBeenCalled()

    const callback = requestIdleCallbackSpy.mock.calls[0]?.[0]
    if (!callback) {
      throw new Error('requestIdleCallback callback missing')
    }

    callback({ didTimeout: false, timeRemaining: () => 1 })

    expect(registerServiceWorker).toHaveBeenCalledTimes(1)

    vi.runOnlyPendingTimers()

    expect(registerServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('falls back to setTimeout when requestIdleCallback is unavailable', async () => {
    vi.useFakeTimers()
    resetMainModule()
    vi.stubGlobal('requestIdleCallback', undefined)

    const { registerServiceWorker } = mockServiceWorkerModules()

    await import('./main')

    expect(registerServiceWorker).not.toHaveBeenCalled()

    vi.runOnlyPendingTimers()

    expect(registerServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('registers service worker via timeout when idle callback never fires', async () => {
    vi.useFakeTimers()
    resetMainModule()

    const requestIdleCallbackSpy = vi.fn<(callback: IdleCallback) => void>()
    vi.stubGlobal('requestIdleCallback', (callback: IdleCallback) => {
      requestIdleCallbackSpy(callback)
      return 1
    })

    const { registerServiceWorker } = mockServiceWorkerModules()

    await import('./main')

    expect(requestIdleCallbackSpy).toHaveBeenCalledTimes(1)
    expect(registerServiceWorker).not.toHaveBeenCalled()

    vi.runOnlyPendingTimers()

    expect(registerServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('waits for window load event before scheduling registration work', async () => {
    vi.useFakeTimers()
    resetMainModule()
    setDocumentReadyState('loading')

    let loadListener: (() => void) | undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(
      ((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'load') {
          if (typeof listener === 'function') {
            loadListener = () => listener(new Event('load'))
          } else if (typeof listener === 'object' && listener !== null && 'handleEvent' in listener) {
            loadListener = () => listener.handleEvent(new Event('load'))
          }
        }
        return undefined
      }) as typeof window.addEventListener,
    )

    const requestIdleCallbackSpy = vi.fn<(callback: IdleCallback) => void>()
    vi.stubGlobal('requestIdleCallback', (callback: IdleCallback) => {
      requestIdleCallbackSpy(callback)
      return 1
    })

    const { registerServiceWorker } = mockServiceWorkerModules()

    await import('./main')

    expect(registerServiceWorker).not.toHaveBeenCalled()
    expect(requestIdleCallbackSpy).not.toHaveBeenCalled()
    expect(loadListener).toBeDefined()

    loadListener?.()

    if (originalIdle) {
      globalWithIdle.requestIdleCallback = originalIdle
    } else {
      delete (globalWithIdle as { requestIdleCallback?: (callback: IdleCallback) => number }).requestIdleCallback
    }

    callback({ didTimeout: false, timeRemaining: () => 1 })

    expect(registerServiceWorker).toHaveBeenCalledTimes(1)
  })
})

function elementContainsQueryClientProvider(node: ReactNode): boolean {
  if (!isValidElement(node)) {
    return false
  }

  if (node.type === QueryClientProvider) {
    return true
  }

  const children = node.props?.children
  if (Array.isArray(children)) {
    return children.some(elementContainsQueryClientProvider)
  }

  if (children) {
    return elementContainsQueryClientProvider(children)
  }

  return false
}
