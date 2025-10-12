import { useCallback } from 'react'

import * as apiModule from '../lib/api'
import type { RecommendResponse, Region } from '../types'
import { normalizeRecommendationResponse, type NormalizeRecommendationResult } from '../utils/recommendations'

type MarketScope = 'domestic' | 'global'
type CropCategory = 'all' | 'leaf' | 'root'

const DEFAULT_MARKET_SCOPE: MarketScope = 'domestic'
const DEFAULT_CATEGORY: CropCategory = 'all'

const api = apiModule as typeof import('../lib/api') & {
  fetchRecommendations: (
    region: Region,
    week: string,
    marketScope: MarketScope,
    category: CropCategory,
  ) => Promise<RecommendResponse>
  fetchRecommend?: (input: { region: Region; week?: string }) => Promise<RecommendResponse>
}

interface RecommendationFetchInput {
  region: Region
  week: string
  preferLegacy?: boolean
}

export type RecommendationFetcher = (
  input: RecommendationFetchInput,
) => Promise<NormalizeRecommendationResult | null>

export const useRecommendationFetcher = (): RecommendationFetcher => {
  return useCallback<RecommendationFetcher>(
    async ({ region, week, preferLegacy = false }) => {
      const callModern = async (): Promise<RecommendResponse | undefined> => {
        if (typeof api.fetchRecommendations !== 'function') {
          return undefined
        }
        try {
          return await api.fetchRecommendations(
            region,
            week,
            DEFAULT_MARKET_SCOPE,
            DEFAULT_CATEGORY,
          )
        } catch {
          return undefined
        }
      }

      const callLegacy = async (): Promise<RecommendResponse | undefined> => {
        if (typeof api.fetchRecommend !== 'function') {
          return undefined
        }
        try {
          return await api.fetchRecommend({ region, week })
        } catch {
          return undefined
        }
      }

      const primary = preferLegacy ? callLegacy : callModern
      const secondary = preferLegacy ? callModern : callLegacy

      const response = (await primary()) ?? (await secondary())
      if (!response) {
        return null
      }

      return normalizeRecommendationResponse(response, week)
    },
    [],
  )
}
