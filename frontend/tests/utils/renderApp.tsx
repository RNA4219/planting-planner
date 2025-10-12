import { cleanup, render, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'

import {
  fetchRecommendations,
  fetchRecommend,
  fetchCrops,
  postRefresh,
  fetchRefreshStatus,
  fetchPrice,
  resetApiMocks,
} from './mocks/api'
import type { StorageState } from './mocks/storage'
import { resetStorageMocks, storageState } from './mocks/storage'

export {
  fetchRecommendations,
  fetchRecommend,
  fetchCrops,
  postRefresh,
  fetchRefreshStatus,
  fetchPrice,
  resetApiMocks,
} from './mocks/api'
export {
  storageState,
  loadRegion,
  saveRegion,
  loadFavorites,
  saveFavorites,
  loadMarketScope,
  saveMarketScope,
  loadSelectedCategory,
  saveSelectedCategory,
  resetStorageMocks,
} from './mocks/storage'
export type { StorageState } from './mocks/storage'

vi.mock('../../src/lib/week', () => ({
  getCurrentIsoWeek: () => '2024-W30',
  normalizeIsoWeek: (value: string) => value,
  formatIsoWeek: (value: string) => value,
  compareIsoWeek: (a: string, b: string) => a.localeCompare(b),
}))

let shouldRestoreTimers = false

afterEach(() => {
  if (shouldRestoreTimers) {
    vi.useRealTimers()
    shouldRestoreTimers = false
  }
})

const resetAppMocks = () => {
  resetStorageMocks()
  resetApiMocks()
}

export const resetAppSpies = resetAppMocks

interface RenderAppOptions {
  readonly useFakeTimers?: boolean
}

export const renderApp = async ({ useFakeTimers = false }: RenderAppOptions = {}) => {
  const [{ AppProviders }, { default: App }] = await Promise.all([
    import('../../src/AppProviders'),
    import('../../src/App'),
  ])
  const user = userEvent.setup(
    useFakeTimers
      ? {
          advanceTimers: vi.advanceTimersByTime,
        }
      : undefined,
  )
  render(
    <AppProviders>
      <App />
    </AppProviders>,
  )
  await waitFor(() => {
    if (!fetchRecommendations.mock.calls.length && !fetchRecommend.mock.calls.length) {
      throw new Error('recommendations not requested yet')
    }
  })
  if (useFakeTimers) {
    vi.useFakeTimers()
    shouldRestoreTimers = true
  }
  const waitForToastToDisappear = async (locator: () => Element | null) => {
    if (typeof locator !== 'function') {
      throw new TypeError('waitForToastToDisappear requires a locator function')
    }
    if (!useFakeTimers) {
      await waitForElementToBeRemoved(locator)
      return
    }
    const toast = locator()
    if (!toast) {
      return
    }
    const maxWaitMs = 10000
    vi.advanceTimersByTime(maxWaitMs)
    await Promise.resolve()
    if (locator()) {
      throw new Error('toast still visible after waiting for removal')
    }
  }
  return { user, waitForToastToDisappear }
}

interface AppTestHarness {
  readonly setup: typeof renderApp
  readonly reset: () => void
  readonly fetchRecommendations: typeof fetchRecommendations
  readonly fetchRecommend: typeof fetchRecommend
  readonly fetchCrops: typeof fetchCrops
  readonly postRefresh: typeof postRefresh
  readonly fetchRefreshStatus: typeof fetchRefreshStatus
  readonly fetchPrice: typeof fetchPrice
  readonly storage: StorageState
}

export const createAppTestHarness = (): AppTestHarness => {
  beforeEach(() => {
    resetAppMocks()
  })

  afterEach(() => {
    cleanup()
    resetAppMocks()
  })

  return {
    setup: renderApp,
    reset: resetAppMocks,
    fetchRecommendations,
    fetchRecommend,
    fetchCrops,
    postRefresh,
    fetchRefreshStatus,
    fetchPrice,
    get storage() {
      return storageState
    },
  }
}
