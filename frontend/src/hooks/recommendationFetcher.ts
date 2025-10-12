import { useCallback } from 'react'

import * as apiModule from '../lib/api'
import type { CropCategory, MarketScope, RecommendResponse, Region } from '../types'
import {
  normalizeRecommendationResponse,
  type NormalizeRecommendationResult,
  type RecommendationSource,
} from '../utils/recommendations'

const api = apiModule as typeof import('../lib/api') & {
  fetchRecommend?: (input: { region: Region; week?: string }) => Promise<RecommendResponse>
}

interface RecommendationFetchInput {
  region: Region
  week: string
  marketScope: MarketScope
  category: CropCategory
  preferLegacy?: boolean
}

export type RecommendationFetcher = (
  input: RecommendationFetchInput,
) => Promise<NormalizeRecommendationResult | null>

export const useRecommendationFetcher = (): RecommendationFetcher => {
  return useCallback<RecommendationFetcher>(
    async ({ region, week, marketScope, category, preferLegacy = false }) => {
      const callModern = async (): Promise<
        { response: RecommendResponse; source: RecommendationSource } | undefined
      > => {
        if (typeof api.fetchRecommendations !== 'function') {
          return undefined
        }
        try {
          const response = await api.fetchRecommendations(region, week, { marketScope, category })
          return { response, source: 'modern' }
        } catch {
          return undefined
        }
      }

      const callLegacy = async (): Promise<
        { response: RecommendResponse; source: RecommendationSource } | undefined
      > => {
        if (typeof api.fetchRecommend !== 'function') {
          return undefined
        }
        try {
          const response = await api.fetchRecommend({ region, week })
          return { response, source: 'legacy' }
        } catch {
          return undefined
        }
      }

      const primary = preferLegacy ? callLegacy : callModern
      const secondary = preferLegacy ? callModern : callLegacy

      const result = (await primary()) ?? (await secondary())
      if (!result) {
        return null
      }

      return normalizeRecommendationResponse(result.response, week, result.source)
    },
    [],
  )
}
