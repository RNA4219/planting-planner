import { vi } from 'vitest'

import type { CropCategory, MarketScope, Region } from '../../../src/types'
import type { RecommendResponseWithFallback } from '../../../src/lib/api'

export type FetchRecommendationsMock = (
  region: Region,
  week: string,
  options: { marketScope: MarketScope; category: CropCategory },
) => Promise<RecommendResponseWithFallback>

const recommendationMocks = vi.hoisted(() => ({
  fetchCropsMock: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  fetchRecommendationsMock: vi.fn<FetchRecommendationsMock>(),
}))

export const fetchCropsMock = recommendationMocks.fetchCropsMock
export const fetchRecommendationsMock = recommendationMocks.fetchRecommendationsMock

export const fetchQueryMock = vi.fn()

export const setupFetchQueryMock = () => {
  fetchQueryMock.mockReset()
  fetchQueryMock.mockImplementation(async (options: unknown) => {
    if (typeof options === 'function') {
      return options()
    }
    const typed = options as { queryFn: () => Promise<unknown> }
    return typed.queryFn()
  })
}

vi.mock('../../../src/lib/api', () => ({
  fetchCrops: fetchCropsMock,
  fetchRecommendations: fetchRecommendationsMock,
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      fetchQuery: fetchQueryMock,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    }),
  }
})

export const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
