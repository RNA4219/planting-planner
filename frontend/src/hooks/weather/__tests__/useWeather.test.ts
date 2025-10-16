import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderHookWithQueryClient } from '../../../../tests/utils/renderHookWithQueryClient'

import { useWeather } from '../useWeather'

interface WeatherDaily {
  readonly date: string
  readonly tmax: number
  readonly tmin: number
  readonly rain: number
  readonly wind: number
}

interface WeatherPayload {
  readonly daily: WeatherDaily[]
  readonly fetchedAt: string
}

interface WeatherApiResult {
  readonly weather: WeatherPayload
  readonly requestId: string
}

const { fetchWeatherMock } = vi.hoisted(() => ({
  fetchWeatherMock: vi.fn<(
    lat: number,
    lon: number,
    options?: { readonly requestId?: string }
  ) => Promise<WeatherApiResult>>(),
}))

vi.mock('../../../lib/api', () => ({
  fetchWeather: fetchWeatherMock,
}))

const createWeatherResponse = (
  overrides: Partial<WeatherApiResult> = {},
): WeatherApiResult => ({
  weather: {
    daily: [
      { date: '2024-01-03', tmax: 31, tmin: 22, rain: 4, wind: 7 },
      { date: '2024-01-02', tmax: 28, tmin: 19, rain: 6, wind: 5 },
    ],
    fetchedAt: '2024-01-03T09:00:00+09:00',
    ...overrides.weather,
  },
  requestId: overrides.requestId ?? 'request-1',
})

const advanceTime = async (milliseconds: number) => {
  vi.advanceTimersByTime(milliseconds)
  await Promise.resolve()
}

describe('useWeather', () => {
  beforeEach(() => {
    fetchWeatherMock.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('最新値と前回値を保持する', async () => {
    fetchWeatherMock.mockResolvedValueOnce(createWeatherResponse())
    const { result } = renderHookWithQueryClient(() => useWeather({ lat: 35.0, lon: 139.0 }))

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    expect(result.current.latest?.requestId).toBe('request-1')
    expect(result.current.previous).toBeNull()

    fetchWeatherMock.mockResolvedValueOnce(
      createWeatherResponse({ requestId: 'request-2', weather: { fetchedAt: '2024-01-04T09:00:00+09:00' } }),
    )

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    expect(result.current.latest?.requestId).toBe('request-2')
    expect(result.current.previous?.requestId).toBe('request-1')
  })

  it('2時間以内の再取得はキャッシュを利用する', async () => {
    fetchWeatherMock.mockResolvedValueOnce(createWeatherResponse())
    const { result } = renderHookWithQueryClient(() => useWeather({ lat: 35.0, lon: 139.0 }))

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    fetchWeatherMock.mockClear()

    await act(async () => {
      await result.current.refresh()
    })

    expect(fetchWeatherMock).not.toHaveBeenCalled()
  })

  it('API が失敗しても直前のデータを保持する', async () => {
    fetchWeatherMock.mockResolvedValueOnce(createWeatherResponse())
    const { result } = renderHookWithQueryClient(() => useWeather({ lat: 35.0, lon: 139.0 }))

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    fetchWeatherMock.mockRejectedValueOnce(new Error('network failure'))

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    expect(result.current.latest?.requestId).toBe('request-1')
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('バックオフ期間を過ぎると再試行できる', async () => {
    fetchWeatherMock.mockResolvedValueOnce(createWeatherResponse())
    const { result } = renderHookWithQueryClient(() => useWeather({ lat: 35.0, lon: 139.0 }))

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    fetchWeatherMock.mockRejectedValueOnce(new Error('temporary failure'))
    await act(async () => {
      await result.current.refresh({ force: true })
    })

    fetchWeatherMock.mockClear()

    await act(async () => {
      await result.current.refresh()
    })

    expect(fetchWeatherMock).not.toHaveBeenCalled()

    await advanceTime(60_000)

    fetchWeatherMock.mockResolvedValueOnce(
      createWeatherResponse({ requestId: 'request-3', weather: { fetchedAt: '2024-01-05T09:00:00+09:00' } }),
    )

    await act(async () => {
      await result.current.refresh()
    })

    expect(fetchWeatherMock).toHaveBeenCalledTimes(1)
    expect(result.current.latest?.requestId).toBe('request-3')
  })
})
