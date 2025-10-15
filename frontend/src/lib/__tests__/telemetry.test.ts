import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import { sendTelemetry, track } from '../telemetry'

describe('telemetry', () => {
  const originalNavigator = globalThis.navigator
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    })
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    })
    globalThis.fetch = originalFetch
  })

  it('exports track that proxies sendTelemetry', () => {
    expect(track).toBe(sendTelemetry)
  })

  it('falls back to fetch when navigator.sendBeacon is unavailable', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    ) as unknown as typeof fetch

    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    })

    globalThis.fetch = mockFetch

    await track('test-event', { foo: 'bar' }, 'request-id')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/telemetry',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    )
  })
})
