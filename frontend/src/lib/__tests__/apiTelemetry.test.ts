import { describe, expect, it, vi } from 'vitest'

import type { Crop } from '../../types'
import { createApiTestContext } from './apiTestContext'

vi.mock('../telemetry', () => ({
  track: vi.fn(),
}))

type TrackMock = ReturnType<typeof vi.fn>

describe('request telemetry', () => {
  const context = createApiTestContext()
  let track: TrackMock

  const loadFetchCrops = async () => {
    const apiModule = await context.loadApiModule()
    const telemetry = await import('../telemetry')
    track = telemetry.track as TrackMock
    track.mockReset()
    return apiModule.fetchCrops
  }

  it('成功時に track を呼び出す', async () => {
    const payload: Crop[] = [
      { id: 1, name: 'ほうれん草', category: 'leaf' },
    ]
    context.fetchMock.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const dateSpy = vi.spyOn(Date, 'now')
    dateSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_450)

    const fetchCrops = await loadFetchCrops()
    const result = await fetchCrops()

    expect(track).toHaveBeenCalledTimes(1)
    const [event, telemetryPayload, requestId] = track.mock.calls[0] ?? []
    expect(event).toBe('api.request')
    expect(telemetryPayload).toMatchObject({
      method: 'GET',
      path: '/api/crops',
      status: 200,
      durationMs: 450,
    })
    expect(typeof requestId).toBe('string')
    expect(result).toEqual(payload)

    dateSpy.mockRestore()
  })

  it('失敗時に status とエラーメッセージを含めて track を呼び出す', async () => {
    context.fetchMock.mockResolvedValue(
      new Response('Server exploded', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }),
    )

    const dateSpy = vi.spyOn(Date, 'now')
    dateSpy.mockReturnValueOnce(2_000).mockReturnValueOnce(2_600)

    const fetchCrops = await loadFetchCrops()

    await expect(fetchCrops()).rejects.toThrow('Server exploded')

    expect(track).toHaveBeenCalledTimes(1)
    const [event, telemetryPayload, requestId] = track.mock.calls[0] ?? []
    expect(event).toBe('api.request')
    expect(telemetryPayload).toMatchObject({
      method: 'GET',
      path: '/api/crops',
      status: 500,
      durationMs: 600,
      errorMessage: 'Server exploded',
    })
    expect(typeof requestId).toBe('string')

    dateSpy.mockRestore()
  })
})
