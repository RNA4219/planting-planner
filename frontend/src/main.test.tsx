import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Crop, RecommendResponse, Region } from './types'

vi.mock('./lib/week', () => ({
  getCurrentIsoWeek: () => 202430,
  formatIsoWeek: (week: number) => `${week}`,
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
  (region: Region, week?: number) => Promise<RecommendResponse>
>()
const fetchCrops = vi.fn<() => Promise<Crop[]>>()
const triggerRefresh = vi.fn<() => Promise<void>>()

vi.mock('./lib/api', () => ({
  fetchRecommendations,
  fetchCrops,
  triggerRefresh,
}))

const resetSpies = () => {
  storageState.region = 'temperate'
  storageState.favorites = []
  loadRegion.mockClear()
  saveRegion.mockClear()
  loadFavorites.mockClear()
  saveFavorites.mockClear()
  fetchRecommendations.mockReset()
  fetchCrops.mockReset()
  triggerRefresh.mockReset()
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

  it('地域選択の変更でAPIとlocalStorageが更新される', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockImplementation(async (region) => ({
      week: 202430,
      region,
      items: [
        {
          crop: region === 'temperate' ? '春菊' : 'にんじん',
          harvest_week: 202435,
          sowing_week: 202430,
          source: 'local-db',
        },
      ],
    }))

    const { user } = await renderApp()

    expect(fetchRecommendations).toHaveBeenLastCalledWith('temperate', 202430)

    const select = screen.getByLabelText('地域')
    await user.selectOptions(select, '寒冷地')

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenLastCalledWith('cold', 202430)
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
      week: 202430,
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: 202435,
          sowing_week: 202430,
          source: 'local-db',
        },
        {
          crop: 'にんじん',
          harvest_week: 202440,
          sowing_week: 202432,
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

    fetchRecommendations.mockResolvedValue({
      week: 202430,
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: 202435,
          sowing_week: 202430,
          source: 'local-db',
        },
        {
          crop: 'にんじん',
          harvest_week: 202438,
          sowing_week: 202431,
          source: 'local-db',
        },
        {
          crop: 'キャベツ',
          harvest_week: 202440,
          sowing_week: 202432,
          source: 'local-db',
        },
      ],
    })

    await renderApp()

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('にんじん')
    expect(rows[1]).toHaveTextContent('春菊')
    expect(rows[2]).toHaveTextContent('キャベツ')
  })
})
