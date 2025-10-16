import { describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type Container, type Root } from 'react-dom/client'

const renderMock = vi.fn<Root['render']>()
const createRootMock = vi.fn<(container: Container) => Root>(() => ({
  render: renderMock,
  unmount: vi.fn<Root['unmount']>(),
}))

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock,
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
