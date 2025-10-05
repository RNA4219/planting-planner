import { vi } from 'vitest'

import type { RecommendResponse, Region } from '../../types'

type FetchRecommendationsMock = (
  region: Region,
  week: string,
) => Promise<RecommendResponse>

const hoistedMocks = vi.hoisted(() => ({
  fetchCropsMock: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  fetchRecommendationsMock: vi.fn<FetchRecommendationsMock>(),
}))

export const fetchCropsMock = hoistedMocks.fetchCropsMock
export const fetchRecommendationsMock = hoistedMocks.fetchRecommendationsMock

vi.mock('../../lib/api', () => ({
  fetchCrops: fetchCropsMock,
  fetchRecommendations: fetchRecommendationsMock,
}))

export const resetRecommendationMocks = () => {
  fetchRecommendationsMock.mockReset()
  fetchCropsMock.mockReset()
  fetchCropsMock.mockResolvedValue([])
}

export const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
