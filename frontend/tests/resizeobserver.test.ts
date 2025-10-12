import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('ResizeObserver を提供する', () => {
    expect(typeof globalThis.ResizeObserver).toBe('function')

    const observer = new globalThis.ResizeObserver(() => undefined)

    expect(typeof observer.observe).toBe('function')
    expect(typeof observer.unobserve).toBe('function')
    expect(typeof observer.disconnect).toBe('function')
  })
})
