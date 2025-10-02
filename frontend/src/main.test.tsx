import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Crop,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from './types'

vi.mock('./lib/week', () => ({
  getCurrentIsoWeek: () => '2024-W30',
  normalizeIsoWeek: (value: string) => value,
  formatIsoWeek: (value: string) => value,
  compareIsoWeek: (a: string, b: string) => a.localeCompare(b),
}))

interface StorageState {
  region: Region
  favorites: number[]
}

const storageState: StorageState = {
  region: 'temperate',
  favorites: [],
}

const loadRegion = vi.fn<() => Region>(() => storageState.region)
const saveRegion = vi.fn<(next: Region) => void>((next) => {
  storageState.region = next
})
const loadFavorites = vi.fn<() => number[]>(() => [...storageState.favorites])
const saveFavorites = vi.fn<(next: number[]) => void>((next) => {
  storageState.favorites = [...next]
})

vi.mock('./lib/storage', () => ({
  loadRegion,
  saveRegion,
  loadFavorites,
  saveFavorites,
}))

const fetchRecommendations = vi.fn<
  (region: Region, week?: string) => Promise<RecommendResponse>
>()
const fetchRecommend = vi.fn<
  (input: { region: Region; week?: string }) => Promise<RecommendResponse>
>()
const fetchCrops = vi.fn<() => Promise<Crop[]>>()
const postRefresh = vi.fn<() => Promise<RefreshResponse>>()
const fetchRefreshStatus = vi.fn<() => Promise<RefreshStatusResponse>>()

vi.mock('./lib/api', () => ({
  fetchRecommendations,
  fetchRecommend,
  fetchCrops,
  postRefresh,
  fetchRefreshStatus,
}))

const resetSpies = () => {
  storageState.region = 'temperate'
  storageState.favorites = []
  loadRegion.mockClear()
  saveRegion.mockClear()
  loadFavorites.mockClear()
  saveFavorites.mockClear()
  fetchRecommendations.mockReset()
  fetchRecommend.mockReset()
  fetchCrops.mockReset()
  postRefresh.mockReset()
  fetchRefreshStatus.mockReset()
}

describe('App', () => {
  beforeEach(() => {
    resetSpies()
  })

  afterEach(() => {
    cleanup()
  })

  const renderApp = async () => {
    const App = (await import('./App')).default
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(fetchRecommendations).toHaveBeenCalled())
    return { user }
  }

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

    expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', '2024-W30')

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
  })

  it('更新ボタンでメッセージが表示され alert を使わない', async () => {
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
      ],
    })

    const { user } = await renderApp()

    const refreshButton = screen.getByRole('button', { name: '更新' })
    const main = screen.getByRole('main')
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    fetchRefreshStatus.mockResolvedValue({
      state: 'success',
      started_at: null,
      finished_at: null,
      updated_records: 1,
      last_error: null,
    })
    let resolveRefresh: (() => void) | undefined
    let rejectRefresh: (() => void) | undefined
    postRefresh.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = () =>
            resolve({
              state: 'success',
              started_at: null,
              finished_at: null,
              updated_records: 0,
              last_error: null,
            })
        }),
    )
    postRefresh.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRefresh = () => reject(new Error('network'))
        }),
    )

    try {
      await user.click(refreshButton)
      expect(refreshButton).toBeDisabled()

      resolveRefresh?.()

      await expect(
        waitFor(() => {
          expect(
            within(main).getByText('更新リクエストを受け付けました。自動ステータス更新は未実装です。'),
          ).toBeInTheDocument()
        }),
      ).resolves.toBeUndefined()

      await new Promise((resolve) => {
        setTimeout(resolve, 1600)
      })

      expect(fetchRefreshStatus).not.toHaveBeenCalled()
      expect(alertSpy).not.toHaveBeenCalled()
      await waitFor(() => expect(refreshButton).not.toBeDisabled())

      await user.click(refreshButton)
      expect(refreshButton).toBeDisabled()

      rejectRefresh?.()

      await expect(
        waitFor(() => {
          expect(
            within(main).getByText('更新リクエストに失敗しました。自動ステータス更新は未実装です。'),
          ).toBeInTheDocument()
        }),
      ).resolves.toBeUndefined()
      expect(alertSpy).not.toHaveBeenCalled()
      await waitFor(() => expect(refreshButton).not.toBeDisabled())
    } finally {
      alertSpy.mockRestore()
    }
  })
})
