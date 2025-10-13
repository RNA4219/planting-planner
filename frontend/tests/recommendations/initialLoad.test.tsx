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
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({ region: 'cold' }),
    )

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
        items: [
          createItem({ crop: '春菊', source: 'legacy' }),
        ],
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
        items: [
          createItem({ crop: '春菊', source: 'legacy' }),
        ],
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
    expect(tabs.map((tab) => tab.textContent)).toEqual(['葉菜', '根菜', '花き'])
    expect(within(tablist).queryByRole('tab', { name: '果菜' })).not.toBeInTheDocument()

    const rootTabButton = tabs[1]!
    expect(tablist).toMatchInlineSnapshot(`
        <div
          aria-label="カテゴリ"
          class="inline-flex items-center gap-1 rounded-full bg-market-50 p-1"
          role="tablist"
        >
          葉菜
        </button>
        <button
          aria-selected="false"
          class="rounded-full bg-transparent px-3 py-2 text-sm font-semibold text-market-700 transition-colors duration-200 hover:bg-market-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-400 aria-selected:bg-market-600 aria-selected:text-white"
          role="tab"
          tabindex="-1"
          type="button"
        >
          根菜
        </button>
        <button
          aria-selected="false"
          class="rounded-full bg-transparent px-3 py-2 text-sm font-semibold text-market-700 transition-colors duration-200 hover:bg-market-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-market-400 aria-selected:bg-market-600 aria-selected:text-white"
          role="tab"
          tabindex="-1"
          type="button"
        >
          花き
        </button>
      </div>
    `)

    await user.click(rootTab)

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith(
        'temperate',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'root' }),
      )
    })
  })
})
