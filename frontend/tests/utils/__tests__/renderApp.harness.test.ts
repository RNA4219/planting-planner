import { describe, expect, it, vi } from 'vitest'

vi.mock('../mocks/storage', () => {
  const resetStorageMocks = vi.fn()
  return {
    resetStorageMocks,
    storageState: { region: 'temperate', favorites: [], marketScope: 'national', category: 'leaf' },
    loadRegion: vi.fn(),
    saveRegion: vi.fn(),
    loadMarketScope: vi.fn(),
    saveMarketScope: vi.fn(),
    loadSelectedCategory: vi.fn(),
    saveSelectedCategory: vi.fn(),
    loadFavorites: vi.fn(),
    saveFavorites: vi.fn(),
  }
})

vi.mock('../mocks/api', () => {
  const resetApiMocks = vi.fn()
  return {
    resetApiMocks,
    fetchRecommendations: vi.fn(),
    fetchRecommend: vi.fn(),
    fetchCrops: vi.fn(),
    postRefresh: vi.fn(),
    fetchRefreshStatus: vi.fn(),
    fetchPrice: vi.fn(),
  }
})

describe('createAppTestHarness', () => {
  it('delegates reset to storage and api mocks', async () => {
    const { createAppTestHarness } = await import('../renderApp')
    const harness = createAppTestHarness()
    const { resetStorageMocks } = await import('../mocks/storage')
    const { resetApiMocks } = await import('../mocks/api')

    harness.reset()

    expect(resetStorageMocks).toHaveBeenCalledTimes(1)
    expect(resetApiMocks).toHaveBeenCalledTimes(1)
  })
})
