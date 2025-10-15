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

vi.mock('../../../src/App', async () => {
  const React = await import('react')
  const { fetchRecommendations } = await import('../mocks/api')
  const App = () => {
    fetchRecommendations()
    return React.createElement('div')
  }
  return { default: App }
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

describe('renderApp timer coordination', () => {
  it('respects caller-provided fake timer configuration', async () => {
    const useFakeTimersSpy = vi.spyOn(vi, 'useFakeTimers')
    const useRealTimersSpy = vi.spyOn(vi, 'useRealTimers')

    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { renderApp } = await import('../renderApp')

    await renderApp({ fakeTimers: 'caller' })

    expect(useFakeTimersSpy).toHaveBeenCalledTimes(1)
    expect(useRealTimersSpy).not.toHaveBeenCalled()

    vi.useRealTimers()
    useFakeTimersSpy.mockRestore()
    useRealTimersSpy.mockRestore()
  })

  it('configures fake timers when requested', async () => {
    const useFakeTimersSpy = vi.spyOn(vi, 'useFakeTimers')

    const { renderApp } = await import('../renderApp')

    await renderApp({ fakeTimers: 'renderApp' })

    expect(useFakeTimersSpy).toHaveBeenCalledTimes(1)

    useFakeTimersSpy.mockRestore()
  })
})
