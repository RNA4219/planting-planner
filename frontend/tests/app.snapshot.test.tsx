import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MockInstance } from 'vitest'

type UseRecommendationsModule = typeof import('../src/hooks/useRecommendations')

import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from '../src/constants/marketScopes'
import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
} from './utils/renderApp'

describe('App snapshot', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  const getNationalMarketScopeTheme = () => {
    const nationalDefinition = MARKET_SCOPE_FALLBACK_DEFINITIONS.find(
      (definition) => definition.scope === 'national',
    )

    if (!nationalDefinition) {
      throw new Error('national market scope definition is missing')
    }

    const {
      theme: { token, text },
    } = nationalDefinition

    const textColor = (() => {
      if (!text.startsWith('#') || text.length !== 7) {
        throw new Error(`unexpected theme text color: ${text}`)
      }

      const hex = text.slice(1)
      const red = Number.parseInt(hex.slice(0, 2), 16)
      const green = Number.parseInt(hex.slice(2, 4), 16)
      const blue = Number.parseInt(hex.slice(4, 6), 16)

      return `rgb(${red}, ${green}, ${blue})`
    })()

    return {
      token,
      className: `bg-${token}`,
      textColor,
    }
  }

  beforeEach(async () => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    useRecommendationsModule = await import('../src/hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
    fetchCrops.mockResolvedValue([
      {
        id: 1,
        name: 'トマト',
        category: 'flower',
      },
      {
        id: 2,
        name: 'レタス',
        category: 'leaf',
      },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: 'トマト',
          sowing_week: '2024-W28',
          harvest_week: '2024-W35',
          source: 'テストデータ',
          growth_days: 70,
        },
        {
          crop: 'レタス',
          sowing_week: '2024-W29',
          harvest_week: '2024-W32',
          source: 'テストデータ',
          growth_days: 45,
        },
      ],
      isMarketFallback: false,
    })
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
    resetAppSpies()
  })

  test('初期表示をスナップショット保存する', async () => {
    await renderApp()
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /トマト/ })).toBeInTheDocument()
    })

    const { className, textColor, token } = getNationalMarketScopeTheme()

    const marketSelect = screen.getByRole('combobox', { name: '市場' })
    expect(marketSelect).toHaveAttribute('data-theme', token)
    expect(marketSelect.className).toContain(className)
    expect(marketSelect).toHaveStyle({ color: textColor })

    const container = document.body.firstElementChild
    expect(container).not.toBeNull()
    expect(container?.querySelector('[class*="app__"]')).toBeNull()
    expect(container).toMatchSnapshot()
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })
})
