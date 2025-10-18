import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  storageState,
} from '../utils/renderApp'
import { fetchMarkets } from '../utils/mocks/api'
import {
  MARKET_SCOPE_FALLBACK_DEFINITIONS,
  toMarketScopeOption,
} from '../../src/constants/marketScopes'
import {
  createItem,
  createRecommendResponse,
  defaultCrops,
  setupRecommendationsTest,
} from '../utils/recommendations'

describe('App recommendations / 初期ロードとフォールバック', () => {
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    ;({ useRecommendationsSpy } = await setupRecommendationsTest())
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('保存済み地域で初回フェッチされる', async () => {
    storageState.region = 'cold'
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue(createRecommendResponse({ region: 'cold' }))

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(
        1,
        'cold',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })

  it('保存済み市場スコープとカテゴリで初回フェッチされる', async () => {
    storageState.marketScope = 'city:tokyo'
    storageState.category = 'flower'
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue(createRecommendResponse())

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(
        1,
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'city:tokyo', category: 'flower' }),
      )
    })
  })

  it('最新API成功時はレガシーAPIを呼び出さない', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockResolvedValue(createRecommendResponse())
    fetchRecommend.mockResolvedValue(createRecommendResponse())

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledTimes(1)
      expect(fetchRecommendations).toHaveBeenCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
    expect(fetchRecommend).not.toHaveBeenCalled()
  })

  it('fetchRecommendations が失敗しても fetchRecommend で初期描画される', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockRejectedValueOnce(new Error('unexpected error'))
    fetchRecommend.mockResolvedValue(
      createRecommendResponse({
        items: [createItem({ crop: '春菊', source: 'legacy' })],
      }),
    )

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommend).toHaveBeenCalledWith({ region: 'temperate', week: '2024-W30' })
    })
    await expect(screen.findByText('春菊')).resolves.toBeInTheDocument()
  })

  it('初期ロードで fetchRecommendations が失敗したら fetchRecommend にフォールバックする', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockRejectedValueOnce(new Error('network error'))
    fetchRecommend.mockResolvedValue(
      createRecommendResponse({
        items: [createItem({ crop: '春菊', source: 'legacy' })],
      }),
    )

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledTimes(1)
      expect(fetchRecommend).toHaveBeenCalledTimes(1)
    })
    expect(fetchRecommendations).toHaveBeenNthCalledWith(
      1,
      'temperate',
      '2024-W30',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
    expect(fetchRecommend).toHaveBeenCalledWith({ region: 'temperate', week: '2024-W30' })
    await expect(screen.findByText('春菊')).resolves.toBeInTheDocument()
  })

  it('週入力は normalizeIsoWeek で揃えてAPIへ送られる', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week, options) => {
      void options
      const resolvedWeek = week ?? '2024-W30'
      return createRecommendResponse({
        week: resolvedWeek,
        region,
        items: [createItem({ crop: '春菊' })],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    const select = screen.getByLabelText('地域')
    const weekInput = screen.getByLabelText('週')
    await user.selectOptions(select, '寒冷地')
    await user.clear(weekInput)
    await user.type(weekInput, '2024w33')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'cold',
        '2024-W33',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
  })

  it('カテゴリタブ切替でカテゴリ指定のリクエストとタブスナップショットが一致する', async () => {
    fetchCrops.mockResolvedValue(defaultCrops)
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({
        items: [
          createItem({ crop: '春菊', category: 'leaf' }),
          createItem({ crop: 'にんじん', category: 'root' }),
        ],
      }),
    )

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(
        1,
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    const tablist = await screen.findByRole('tablist', { name: 'カテゴリ' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs.map((tab) => tab.textContent)).toEqual(['葉菜類', '根菜類', '花き類'])
    expect(within(tablist).queryByRole('tab', { name: '果菜' })).not.toBeInTheDocument()

    const rootTabButton = tabs[1]!

    expect(tablist).toHaveAttribute('aria-label', 'カテゴリ')
    expect(tablist).toHaveAttribute('role', 'tablist')
    expect(tablist).toHaveClass('bg-market-neutral-container')
    expect(tablist).toHaveClass('rounded-full')

    tabs.forEach((tab) => {
      expect(tab).toHaveClass('rounded-full')
      expect(tab).toHaveClass('aria-selected:bg-market-accent')
      expect(tab).toHaveClass('aria-selected:text-white')
    })

    await user.click(rootTabButton)

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'root' }),
      )
    })
  })

  it('市場カテゴリ定義に従ってタブとカテゴリ引数が同期する', async () => {
    const marketOptions = MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => {
      if (definition.scope !== 'national') {
        return toMarketScopeOption(definition)
      }
      return toMarketScopeOption({
        ...definition,
        categories: [
          { category: 'root', displayName: '根菜' },
          { category: 'flower', displayName: '花き' },
        ],
      })
    })
    fetchMarkets.mockResolvedValue({
      generated_at: '2024-07-01T00:00:00.000Z',
      markets: marketOptions,
    })
    fetchCrops.mockResolvedValue(defaultCrops)
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({
        items: [createItem({ crop: 'にんじん', category: 'root' })],
      }),
    )

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'root' }),
      )
    })

    const tablist = await screen.findByRole('tablist', { name: 'カテゴリ' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['根菜', '花き'])
    expect(within(tablist).queryByRole('tab', { name: '葉菜' })).not.toBeInTheDocument()

    const flowerTab = within(tablist).getByRole('tab', { name: '花き' })
    await user.click(flowerTab)

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'flower' }),
      )
    })
  })

  it('市場メタデータが逆順でも priority 昇順でカテゴリタブとリクエストが揃う', async () => {
    const marketOptions = MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => {
      if (definition.scope !== 'national') {
        return toMarketScopeOption(definition)
      }
      return toMarketScopeOption({
        ...definition,
        categories: [
          { category: 'leaf', displayName: '葉菜', priority: 2 },
          { category: 'root', displayName: '根菜', priority: 1 },
          { category: 'flower', displayName: '花き' },
        ],
      })
    })
    fetchMarkets.mockResolvedValue({
      generated_at: '2024-07-01T00:00:00.000Z',
      markets: marketOptions,
    })
    fetchCrops.mockResolvedValue(defaultCrops)
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({
        items: [createItem({ crop: 'にんじん', category: 'root' })],
      }),
    )

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    const tablist = await screen.findByRole('tablist', { name: 'カテゴリ' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['根菜', '葉菜', '花き'])

    const [rootTab, leafTab] = tabs
    await user.click(rootTab)

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'root' }),
      )
    })

    await user.click(leafTab)

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })
  })

  it('カテゴリタブが推奨一覧セクションを aria-controls で参照する', async () => {
    fetchCrops.mockResolvedValue(defaultCrops)
    fetchRecommendations.mockResolvedValue(createRecommendResponse())

    await renderApp()

    const tablist = await screen.findByRole('tablist', { name: 'カテゴリ' })
    const controlsId = tablist.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    const panel = controlsId ? document.getElementById(controlsId) : null
    expect(panel).not.toBeNull()
    expect(panel).toHaveAttribute('role', 'tabpanel')
  })
})
