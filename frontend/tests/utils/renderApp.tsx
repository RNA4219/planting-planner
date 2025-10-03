import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import type {
  Crop,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from '../../src/types'

interface StorageState {
  region: Region
  favorites: number[]
}

export const storageState: StorageState = {
  region: 'temperate',
  favorites: [],
}

export const loadRegion = vi.fn<() => Region>(() => storageState.region)
export const saveRegion = vi.fn<(next: Region) => void>((next) => {
  storageState.region = next
})

export const loadFavorites = vi.fn<() => number[]>(() => [...storageState.favorites])
export const saveFavorites = vi.fn<(next: number[]) => void>((next) => {
  storageState.favorites = [...next]
})

vi.mock('../../src/lib/week', () => ({
  getCurrentIsoWeek: () => '2024-W30',
  normalizeIsoWeek: (value: string) => value,
  formatIsoWeek: (value: string) => value,
  compareIsoWeek: (a: string, b: string) => a.localeCompare(b),
}))

vi.mock('../../src/lib/storage', () => ({
  loadRegion,
  saveRegion,
  loadFavorites,
  saveFavorites,
}))

export const fetchRecommendations = vi.fn<
  (region: Region, week?: string) => Promise<RecommendResponse>
>()
export const fetchRecommend = vi.fn<
  (input: { region: Region; week?: string }) => Promise<RecommendResponse>
>()
export const fetchCrops = vi.fn<() => Promise<Crop[]>>()
export const postRefresh = vi.fn<() => Promise<RefreshResponse>>()
export const fetchRefreshStatus = vi.fn<() => Promise<RefreshStatusResponse>>()
export const fetchPrice = vi.fn<
  (
    cropId: number,
    frm?: string,
    to?: string,
  ) => Promise<{
    crop_id: number
    crop: string
    unit: string
    source: string
    prices: { week: string; avg_price: number | null; stddev?: number | null }[]
  }>
>()

vi.mock('../../src/lib/api', () => ({
  fetchRecommendations,
  fetchRecommend,
  fetchCrops,
  postRefresh,
  fetchRefreshStatus,
  fetchPrice,
}))

export const resetAppSpies = () => {
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
  fetchPrice.mockReset()
}

export const renderApp = async () => {
  const App = (await import('../../src/App')).default
  const user = userEvent.setup()
  render(<App />)
  await waitFor(() => {
    if (!fetchRecommendations.mock.calls.length && !fetchRecommend.mock.calls.length) {
      throw new Error('recommendations not requested yet')
    }
  })
  return { user }
}
