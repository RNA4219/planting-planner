import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Crop, RecommendResponse, Region } from './types'

vi.mock('./lib/week', () => ({
  currentIsoWeek: () => '2024-W30',
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

const fetchRecommend = vi.fn<
  (input: { region: Region; week?: string }) => Promise<RecommendResponse>
>()
const fetchCrops = vi.fn<() => Promise<Crop[]>>()
const postRefresh = vi.fn<() => Promise<string>>()

vi.mock('./lib/api', () => ({
  fetchRecommend,
  fetchCrops,
  postRefresh,
}))

const resetSpies = () => {
  storageState.region = 'temperate'
  storageState.favorites = []
  loadRegion.mockClear()
  saveRegion.mockClear()
  loadFavorites.mockClear()
  saveFavorites.mockClear()
  fetchRecommend.mockReset()
  fetchCrops.mockReset()
  postRefresh.mockReset()
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
    await waitFor(() => expect(fetchRecommend).toHaveBeenCalled())
    return { user }
  }

  it('地域選択と週入力でAPIが手動フェッチされる', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommend.mockImplementation(async ({ region }) => ({
      week: '2024-W30',
      region,
      items: [
        {
          crop: region === 'temperate' ? '春菊' : 'にんじん',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
        },
      ],
    }))

    const { user } = await renderApp()

    expect(fetchRecommend).toHaveBeenLastCalledWith({
      region: 'temperate',
      week: '2024-W30',
    })

    const select = screen.getByLabelText('地域')
    const weekInput = screen.getByLabelText('週')
    await user.selectOptions(select, '寒冷地')
    await user.clear(weekInput)
    await user.type(weekInput, '2024-W32')
    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))

    await waitFor(() => {
      expect(fetchRecommend).toHaveBeenLastCalledWith({ region: 'cold', week: '2024-W32' })
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
    fetchRecommend.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
        },
        {
          crop: 'にんじん',
          harvest_week: '2024-W40',
          sowing_week: '2024-W32',
          source: 'local-db',
        },
      ],
    })

    const { user } = await renderApp()

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

    fetchRecommend.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',

      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W40',
          sowing_week: '2024-W31',
          source: 'local-db',
        },
        {
          crop: 'にんじん',
          harvest_week: '2024-W39',
          sowing_week: '2024-W30',
          source: 'local-db',
        },
        {
          crop: 'キャベツ',
          harvest_week: '2024-W42',
          sowing_week: '2024-W33',
          source: 'local-db',
        },
      ],
    })

    const { user } = await renderApp()

    expect(fetchRecommendations).not.toHaveBeenCalled()

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

    expect(rows[0]).toHaveTextContent('にんじん')
    expect(rows[1]).toHaveTextContent('春菊')
    expect(rows[2]).toHaveTextContent('キャベツ')

    const favToggle = within(rows[1]).getByRole('button', { name: '春菊をお気に入りに追加' })
    await user.click(favToggle)

    expect(saveFavorites).toHaveBeenLastCalledWith([2, 1])
  })
})
