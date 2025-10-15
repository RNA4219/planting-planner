import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendTelemetry, track } from '../telemetry'

describe('telemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('exports track that proxies sendTelemetry', () => {
    expect(track).toBe(sendTelemetry)
  })

  it('falls back to fetch when navigator.sendBeacon is unavailable', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    ) as unknown as typeof fetch

    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', mockFetch)

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
