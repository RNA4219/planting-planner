import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendTelemetry } from '../../src/lib/telemetry'

const TELEMETRY_ENDPOINT = '/api/telemetry'

describe('telemetry', () => {
  const fetchMock = vi.fn()
  const originalSendBeacon = globalThis.navigator.sendBeacon

  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: originalSendBeacon,
    })
    fetchMock.mockReset()
  })

  it('falls back to fetch with request id header when beacon is unavailable', async () => {
    await sendTelemetry('event', {}, 'req-123')

    expect(fetchMock).toHaveBeenCalledWith(
      TELEMETRY_ENDPOINT,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-request-id': 'req-123' }),
      }),
    )
  })
})
