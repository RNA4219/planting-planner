import { vi } from 'vitest'

import type { CropCategory, MarketScope, Region } from '../../../src/types'
import * as apiModule from '../../../src/lib/api'
import type { RecommendResponseWithFallback } from '../../../src/lib/api'

type FetchRecommendationsMock = (
  region: Region,
  week: string,
  options: { marketScope: MarketScope; category: CropCategory },
) => Promise<RecommendResponseWithFallback>

const fetchMocks = vi.hoisted(() => ({
  fetchCropsMock: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  fetchRecommendationsMock: vi.fn<FetchRecommendationsMock>(),
}))

export const fetchCropsMock = fetchMocks.fetchCropsMock
export const fetchRecommendationsMock = fetchMocks.fetchRecommendationsMock

vi.spyOn(apiModule, 'fetchCrops').mockImplementation(fetchCropsMock)
vi.spyOn(apiModule, 'fetchRecommendations').mockImplementation((region, week, options) =>
  fetchRecommendationsMock(region, week, options),
)

export const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export const setupFetchQueryMock = (fetchQueryMock: ReturnType<typeof vi.fn>) => {
  fetchQueryMock.mockReset()
  fetchQueryMock.mockImplementation(async (options: unknown) => {
    if (typeof options === 'function') {
      return options()
    }

    const typed = options as { queryFn: () => Promise<unknown> }
    return typed.queryFn()
  })
}
