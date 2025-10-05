import { vi } from 'vitest'

import type { RecommendResponse, Region } from '../../../types'

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

vi.mock('../../../lib/api', () => ({
  fetchCrops: fetchCropsMock,
  fetchRecommendations: fetchRecommendationsMock,
}))

export const resetRecommendationMocks = () => {
  fetchCropsMock.mockReset()
  fetchCropsMock.mockResolvedValue([])
  fetchRecommendationsMock.mockReset()
}
