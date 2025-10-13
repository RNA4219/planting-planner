import type {
  Crop,
  CropCategory,
  MarketScope,
  PriceSeries,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from '../types'
import type { MarketScopeOption } from '../constants/marketScopes'

const API_ENDPOINT = (import.meta.env.VITE_API_ENDPOINT ?? '/api').replace(/\/$/, '')

const API_ENDPOINT_URL = (() => {
  try {
    return new URL(API_ENDPOINT)
  } catch {
    return undefined
  }
})()

const API_ENDPOINT_ORIGIN = API_ENDPOINT_URL?.origin ?? ''
const API_ENDPOINT_PREFIX = API_ENDPOINT_URL
  ? `${API_ENDPOINT_ORIGIN}${API_ENDPOINT_URL.pathname.replace(/\/$/, '')}`
  : API_ENDPOINT

type BuildUrlOptions = {
  readonly includePrefix?: boolean
}

const buildUrl = (
  path: string,
  searchParams?: URLSearchParams,
  options?: BuildUrlOptions,
): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const search = searchParams?.toString()

  if (options?.includePrefix === false && API_ENDPOINT_URL) {
    const url = new URL(API_ENDPOINT_URL.href)
    url.pathname = normalizedPath
    url.search = search ?? ''
    return url.toString()
  }

  const prefix = options?.includePrefix === false ? API_ENDPOINT_ORIGIN : API_ENDPOINT_PREFIX
  return `${prefix}${normalizedPath}${search ? `?${search}` : ''}`
}

class HttpError extends Error {
  readonly status: number

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HttpError'
    this.status = status
  }
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text()
    throw new HttpError(
      message || `Request failed with status ${response.status}`,
      response.status,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

const request = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })

  return parseResponse<T>(response)
}

export const fetchCrops = async (): Promise<Crop[]> => {
  const url = buildUrl('/crops')
  return request<Crop[]>(url)
}

export type MarketScopeOptionWithTheme = MarketScopeOption & {
  readonly theme?: {
    readonly token?: string
    readonly hexColor?: string
    readonly textColor?: string
  }
}

export interface MarketsResponse {
  readonly markets: MarketScopeOptionWithTheme[]
  readonly generated_at: string
}

interface MarketMetadataEntry {
  readonly scope: MarketScope
  readonly display_name: string
  readonly theme?: {
    readonly token?: string
    readonly hex_color?: string
    readonly text_color?: string
  }
}

interface MarketsApiResponse {
  readonly markets: MarketMetadataEntry[]
  readonly generated_at: string
}

export const fetchMarkets = async (): Promise<MarketsResponse> => {
  const url = buildUrl('/markets')
  try {
    const payload = await request<MarketsApiResponse>(url)
    return {
      markets: payload.markets.map((market) => {
        const mapped: MarketScopeOptionWithTheme = {
          value: market.scope,
          label: market.display_name,
        }
        if (market.theme) {
          mapped.theme = {
            token: market.theme.token,
            hexColor: market.theme.hex_color,
            textColor: market.theme.text_color,
          }
        }
        return mapped
      }),
      generated_at: payload.generated_at,
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) {
      throw new HttpError('市場一覧 API は現在利用できません (503)', error.status, {
        cause: error,
      })
    }
    throw error
  }
}

export interface RecommendResponseWithFallback extends RecommendResponse {
  readonly isMarketFallback: boolean
}

export const fetchRecommendations = async (
  region: Region,
  week: string | undefined,
  { marketScope, category }: { marketScope: MarketScope; category: CropCategory },
): Promise<RecommendResponseWithFallback> => {
  const params = new URLSearchParams({ region, marketScope, category })
  if (week) {
    params.set('week', week)
  }
  const url = buildUrl('/recommend', params)
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const payload = await parseResponse<RecommendResponse>(response)
  const fallbackHeader = response.headers.get('x-market-fallback')
  const isMarketFallback = typeof fallbackHeader === 'string' && fallbackHeader.toLowerCase() === 'true'
  return { ...payload, isMarketFallback }
}

export const fetchRecommend = async ({
  region,
  week,
}: {
  region: Region
  week?: string
}): Promise<RecommendResponse> => {
  const params = new URLSearchParams({ region })
  if (week) {
    params.set('week', week)
  }
  const url = buildUrl('/recommend', params, { includePrefix: false })
  return request<RecommendResponse>(url)
}

export const postRefresh = async (body?: unknown): Promise<RefreshResponse> => {
  const url = buildUrl('/refresh')
  const init: RequestInit = { method: 'POST' }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return request<RefreshResponse>(url, init)
}

export const fetchRefreshStatus = async (): Promise<RefreshStatusResponse> => {
  const url = buildUrl('/refresh/status')
  return request<RefreshStatusResponse>(url)
}

export const fetchPrice = async (
  cropId: number,
  frm?: string,
  to?: string,
  marketScope?: MarketScope,
): Promise<PriceSeries> => {
  const params = new URLSearchParams({ crop_id: String(cropId) })
  if (frm) params.set('frm', frm)
  if (to) params.set('to', to)
  if (marketScope) params.set('marketScope', marketScope)
  const url = buildUrl('/price', params)
  return request<PriceSeries>(url)
}
