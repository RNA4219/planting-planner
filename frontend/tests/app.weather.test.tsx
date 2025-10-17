import '@testing-library/jest-dom/vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  renderApp,
  resetAppSpies,
  fetchRecommendations,
  fetchRecommend,
  fetchWeather,
  fetchCrops,
} from './utils/renderApp'
import { createRecommendResponse } from './utils/mocks/api'

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

const createWeatherResponse = (
  overrides: Partial<WeatherApiResult> = {},
): WeatherApiResult => ({
  weather: {
    daily: [
      { date: '2024-01-03', tmax: 30, tmin: 20, rain: 5, wind: 4 },
      { date: '2024-01-02', tmax: 28, tmin: 18, rain: 3, wind: 6 },
    ],
    fetchedAt: '2024-01-03T09:00:00+09:00',
    ...overrides.weather,
  },
  requestId: overrides.requestId ?? 'weather-request-1',
})

describe('App weather tab', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchRecommendations.mockResolvedValue(createRecommendResponse())
    fetchRecommend.mockResolvedValue({ week: '2024-W30', region: 'temperate', items: [] })
    fetchCrops.mockResolvedValue([])
    ;(globalThis as { __APP_FEATURE_FLAGS__?: Record<string, boolean> }).__APP_FEATURE_FLAGS__ = {
      WEATHER_TAB: true,
    }
  })

  it('WEATHER_TAB が有効な場合に天気タブを表示し最新値と前回値を描画する', async () => {
    fetchWeather.mockResolvedValue(createWeatherResponse())

    await renderApp()

    const weatherRegion = await screen.findByRole('region', { name: '天気' })
    expect(weatherRegion).toBeInTheDocument()

    const latestCard = within(weatherRegion).getByTestId('weather-latest')
    const previousCard = within(weatherRegion).getByTestId('weather-previous')

    await within(latestCard).findByText('2024-01-03')
    await within(previousCard).findByText('2024-01-02')
    await within(latestCard).findByText('30℃')
    await within(previousCard).findByText('28℃')
  })

  it('WEATHER_TAB が無効な場合は天気タブを表示しない', async () => {
    ;(globalThis as { __APP_FEATURE_FLAGS__?: Record<string, boolean> }).__APP_FEATURE_FLAGS__ = {
      WEATHER_TAB: false,
    }
    fetchWeather.mockResolvedValue(createWeatherResponse())

    await renderApp()

    await waitFor(() => {
      expect(fetchWeather).not.toHaveBeenCalled()
    })
    expect(screen.queryByRole('region', { name: '天気' })).toBeNull()
  })

  it('API が失敗しても直前の天気データを保持する', async () => {
    fetchWeather.mockResolvedValueOnce(createWeatherResponse())
    const { user } = await renderApp()

    const weatherRegion = await screen.findByRole('region', { name: '天気' })
    await within(weatherRegion).findByText('2024-01-03')

    fetchWeather.mockRejectedValueOnce(new Error('network failure'))

    const regionSelect = screen.getByLabelText('地域')
    await user.selectOptions(regionSelect, '暖地')

    await waitFor(() => {
      expect(fetchWeather).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(within(weatherRegion).getByText('2024-01-03')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(within(weatherRegion).getByText('30℃')).toBeInTheDocument()
    })
  })
})
