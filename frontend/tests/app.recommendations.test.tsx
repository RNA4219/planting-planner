import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'

import type { RecommendResponse } from '../src/types'
import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  fetchRefreshStatus,
  renderApp,
  resetAppSpies,
  saveFavorites,
  saveRegion,
  storageState,
} from './utils/renderApp'

type UseRecommendationsModule = typeof import('../src/hooks/useRecommendations')
type RecommendationItem = RecommendResponse['items'][number]

const defaultCrops = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: 'にんじん', category: 'root' },
  { id: 3, name: 'キャベツ', category: 'leaf' },
] as const

const createRecommendResponse = (
  overrides: Partial<RecommendResponse> = {},
): RecommendResponse => ({
  week: '2024-W30',
  region: 'temperate',
  items: [],
  ...overrides,
})

const createItem = (overrides: Partial<RecommendationItem> & { crop: string }): RecommendationItem => ({
  crop: overrides.crop,
  sowing_week: '2024-W30',
  harvest_week: '2024-W35',
  source: 'local-db',
  growth_days: 42,
  ...overrides,
})

describe('App recommendations', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    useRecommendationsModule = await import('../src/hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
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
      expect(fetchRecommendations).toHaveBeenNthCalledWith(1, 'cold', '2024-W30')
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })

  it('最新API成功時はレガシーAPIを呼び出さない', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockResolvedValue(createRecommendResponse())
    fetchRecommend.mockResolvedValue(createRecommendResponse())

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledTimes(1)
      expect(fetchRecommendations).toHaveBeenCalledWith('temperate', '2024-W30')
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
    expect(screen.getByText('春菊')).toBeInTheDocument()
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
    expect(fetchRecommendations).toHaveBeenNthCalledWith(1, 'temperate', '2024-W30')
    expect(fetchRecommend).toHaveBeenCalledWith({ region: 'temperate', week: '2024-W30' })
    expect(screen.getByText('春菊')).toBeInTheDocument()
  })

  it('週入力は normalizeIsoWeek で揃えてAPIへ送られる', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region, week) => {
      const resolvedWeek = week ?? '2024-W30'
      return createRecommendResponse({
        week: resolvedWeek,
        region,
        items: [createItem({ crop: '春菊' })],
      })
    })

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')
    })

    const select = screen.getByLabelText('地域')
    const weekInput = screen.getByLabelText('週')
    await user.selectOptions(select, '寒冷地')
    await user.clear(weekInput)
    await user.type(weekInput, '2024w33')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('cold', '2024-W33')
    })
  })

  it('地域選択と週入力でAPIが手動フェッチされる', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region) =>
      createRecommendResponse({
        region,
        items: [
          createItem({
            crop: region === 'temperate' ? '春菊' : 'にんじん',
          }),
        ],
      }),
    )

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()

    const select = screen.getByLabelText('地域')
    const weekInput = screen.getByLabelText('週')
    await user.selectOptions(select, '寒冷地')
    await user.clear(weekInput)
    await user.type(weekInput, '2024-W32')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('cold', '2024-W32')
    })
    expect(saveRegion).toHaveBeenLastCalledWith('cold')
    expect(screen.getByText('にんじん')).toBeInTheDocument()
  })

  it('地域変更で即時フェッチされテーブルが更新される', async () => {
    fetchCrops.mockResolvedValue(defaultCrops.slice(0, 2))
    fetchRecommendations.mockImplementation(async (region) =>
      createRecommendResponse({
        region,
        items: [
          createItem({
            crop: region === 'temperate' ? '春菊' : 'にんじん',
          }),
        ],
      }),
    )

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(1, 'temperate', '2024-W30')
    })

    expect(screen.getByText('春菊')).toBeInTheDocument()

    const select = screen.getByLabelText('地域')
    await user.selectOptions(select, '寒冷地')

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(2, 'cold', '2024-W30')
    })

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const coldRow = rows.find((row) => within(row).queryByText('にんじん'))
    expect(coldRow).toBeDefined()
    expect(within(rows[0]!).queryByText('春菊')).not.toBeInTheDocument()
  })

  it('推奨表がお気に入りを優先して描画される', async () => {
    storageState.favorites = [2]
    fetchCrops.mockResolvedValue(defaultCrops.map((crop) => ({ ...crop })))
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({
        items: [
          createItem({
            crop: '春菊',
            sowing_week: '2024-W31',
            harvest_week: '2024-W40',
            growth_days: 45,
          }),
          createItem({
            crop: 'にんじん',
            sowing_week: '2024-W30',
            harvest_week: '2024-W39',
            growth_days: 65,
          }),
          createItem({
            crop: 'キャベツ',
            sowing_week: '2024-W33',
            harvest_week: '2024-W42',
            growth_days: 60,
          }),
        ],
      }),
    )

    const { user } = await renderApp()

    expect(fetchRefreshStatus).not.toHaveBeenCalled()

    const select = screen.getByLabelText('地域')
    await user.selectOptions(select, '寒冷地')
    await waitFor(() => expect(saveRegion).toHaveBeenLastCalledWith('cold'))

    const weekInput = screen.getByLabelText('週')
    await user.clear(weekInput)
    await user.type(weekInput, '2024-W32')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('cold', '2024-W32')
    })

    const table = await screen.findByRole('table')

    await waitFor(() => {
      const rows = within(table).getAllByRole('row').slice(1)
      const [firstRow, secondRow, thirdRow] = rows
      if (!firstRow || !secondRow || !thirdRow) {
        throw new Error('推奨テーブルの行が不足しています')
      }
      expect(firstRow).toHaveTextContent('にんじん')
      expect(secondRow).toHaveTextContent('春菊')
      expect(thirdRow).toHaveTextContent('キャベツ')
    })

    const rows = within(table).getAllByRole('row').slice(1)
    const favToggle = within(rows[1]!).getByRole('button', { name: '春菊をお気に入りに追加' })
    await user.click(favToggle)

    expect(saveFavorites).toHaveBeenLastCalledWith([2, 1])
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })
})
