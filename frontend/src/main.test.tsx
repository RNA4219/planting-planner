import { describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

const renderMock = vi.fn()

vi.mock('react-dom/client', () => ({
  createRoot: () => ({
    render: renderMock,
  }),
}))

describe('main entrypoint', () => {
  it('renders App within QueryClientProvider', async () => {
    vi.resetModules()
    renderMock.mockClear()
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')

    expect(renderMock).toHaveBeenCalledTimes(1)
    const element = renderMock.mock.calls[0]?.[0]
    expect(elementContainsQueryClientProvider(element)).toBe(true)
  })

  it('imports global styles', async () => {
    vi.resetModules()
    renderMock.mockClear()
    document.body.innerHTML = '<div id="root"></div>'

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

    type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void
    const idleCallbacks: IdleCallback[] = []
    const idleSpy = vi.fn((callback: IdleCallback) => {
      idleCallbacks.push(callback)
      return 1
    })
    const globalWithIdle = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: IdleCallback) => number
    }
    const originalIdle = globalWithIdle.requestIdleCallback
    globalWithIdle.requestIdleCallback = idleSpy

    await import('./main')

    expect(registerMock).not.toHaveBeenCalled()

    idleCallbacks.forEach((callback) =>
      callback({ didTimeout: false, timeRemaining: () => 0 }),
    )
    await Promise.resolve()

    expect(registerMock).toHaveBeenCalledTimes(1)

    if (originalIdle) {
      globalWithIdle.requestIdleCallback = originalIdle
    } else {
      delete (globalWithIdle as { requestIdleCallback?: (callback: IdleCallback) => number }).requestIdleCallback
    }
    vi.doUnmock('./lib/swClient')
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
