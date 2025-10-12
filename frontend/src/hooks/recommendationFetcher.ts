import { useCallback } from 'react'

import * as apiModule from '../lib/api'
import type { CropCategory, MarketScope, RecommendResponse, Region } from '../types'
import type { RecommendResponseWithFallback } from '../lib/api'
import {
  normalizeRecommendationResponse,
  type NormalizeRecommendationResult,
  type RecommendationSource,
} from '../utils/recommendations'

const api = apiModule as typeof import('../lib/api') & {
  fetchRecommend?: (input: { region: Region; week?: string }) => Promise<RecommendResponse>
  fetchRecommendations?: (
    region: Region,
    week: string,
    options: { marketScope: MarketScope; category: CropCategory },
  ) => Promise<RecommendResponseWithFallback>
}

interface RecommendationFetchInput {
  region: Region
  week: string
  marketScope: MarketScope
  category: CropCategory
  preferLegacy?: boolean
}

export interface RecommendationFetchResult {
  readonly result: NormalizeRecommendationResult | null
  readonly isMarketFallback: boolean
}

export type RecommendationFetcher = (
  input: RecommendationFetchInput,
) => Promise<RecommendationFetchResult>

export const useRecommendationFetcher = (): RecommendationFetcher => {
  return useCallback<RecommendationFetcher>(
    async ({ region, week, marketScope, category, preferLegacy = false }) => {
      const callModern = async (): Promise<
        | {
            response: RecommendResponse
            source: RecommendationSource
            isMarketFallback: boolean
          }
        | undefined
      > => {
        if (typeof api.fetchRecommendations !== 'function') {
          return undefined
        }
        try {
          const response = await api.fetchRecommendations(region, week, { marketScope, category })
          const { isMarketFallback, ...rest } = response
          return { response: rest, source: 'modern', isMarketFallback }
        } catch {
          return undefined
        }
      }

      const callLegacy = async (): Promise<
        | {
            response: RecommendResponse
            source: RecommendationSource
            isMarketFallback: boolean
          }
        | undefined
      > => {
        if (typeof api.fetchRecommend !== 'function') {
          return undefined
        }
        try {
          const response = await api.fetchRecommend({ region, week })
          return { response, source: 'legacy', isMarketFallback: false }
        } catch {
          return undefined
        }
      }

      const primary = preferLegacy ? callLegacy : callModern
      const secondary = preferLegacy ? callModern : callLegacy

      const result = (await primary()) ?? (await secondary())
      if (!result) {
        return { result: null, isMarketFallback: false }
      }

      return {
        result: normalizeRecommendationResponse(result.response, week, result.source),
        isMarketFallback: result.isMarketFallback,
      }
    },
    [],
  )
}
