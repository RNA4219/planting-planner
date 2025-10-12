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
