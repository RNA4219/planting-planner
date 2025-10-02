import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'

type UseRecommendationsModule = typeof import('./hooks/useRecommendations')

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
  saveFavorites,
  saveRegion,
  storageState,
  fetchRefreshStatus,
} from '../tests/utils/renderApp'

describe('App behavior', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    useRecommendationsModule = await import('./hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('保存済み地域で初回フェッチされる', async () => {
    storageState.region = 'cold'

    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'cold',
      items: [],
    })

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(1, 'cold', '2024-W30')
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })

  it('fetchRecommendations が失敗しても fetchRecommend で初期描画される', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockRejectedValueOnce(new Error('unexpected error'))
    fetchRecommend.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'legacy',
          growth_days: 42,
        },
      ],
    })

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommend).toHaveBeenCalledWith({ region: 'temperate', week: '2024-W30' })
    })
    expect(screen.getByText('春菊')).toBeInTheDocument()
  })

  it('地域選択と週入力でAPIが手動フェッチされる', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockImplementation(async (region) => ({
      week: '2024-W30',
      region,
      items: [
        {
          crop: region === 'temperate' ? '春菊' : 'にんじん',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
          growth_days: 42,
        },
      ],
    }))

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
    expect(useRecommendationsSpy).toHaveBeenCalled()
    expect(saveRegion).toHaveBeenLastCalledWith('cold')
    expect(screen.getByText('にんじん')).toBeInTheDocument()
  })

  it('お気に入りトグルで保存内容が更新される', async () => {
    storageState.favorites = [1]

    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
          growth_days: 35,
        },
        {
          crop: 'にんじん',
          harvest_week: '2024-W40',
          sowing_week: '2024-W32',
          source: 'local-db',
          growth_days: 70,
        },
      ],
    })

    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    const toggle = screen.getByRole('button', { name: 'にんじんをお気に入りに追加' })
    await user.click(toggle)

    expect(saveFavorites).toHaveBeenLastCalledWith([1, 2])
  })

  it('推奨表がお気に入りを優先して描画される', async () => {
    storageState.favorites = [2]

    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
      { id: 3, name: 'キャベツ', category: 'leaf' },
    ])

    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W40',
          sowing_week: '2024-W31',
          source: 'local-db',
          growth_days: 45,
        },
        {
          crop: 'にんじん',
          harvest_week: '2024-W39',
          sowing_week: '2024-W30',
          source: 'local-db',
          growth_days: 65,
        },
        {
          crop: 'キャベツ',
          harvest_week: '2024-W42',
          sowing_week: '2024-W33',
          source: 'local-db',
          growth_days: 60,
        },
      ],
    })

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
    const rows = within(table).getAllByRole('row').slice(1)
    const [firstRow, secondRow, thirdRow] = rows

    if (!firstRow || !secondRow || !thirdRow) {
      throw new Error('推奨テーブルの行が不足しています')
    }

    expect(firstRow).toHaveTextContent('にんじん')
    expect(secondRow).toHaveTextContent('春菊')
    expect(thirdRow).toHaveTextContent('キャベツ')

    const favToggle = within(rows[1]!).getByRole('button', { name: '春菊をお気に入りに追加' })

    await user.click(favToggle)

    expect(saveFavorites).toHaveBeenLastCalledWith([2, 1])
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })
})
