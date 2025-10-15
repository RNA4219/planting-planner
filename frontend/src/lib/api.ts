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
import {
  fromMarketScopeApiDefinition,
  toMarketScopeOption,
  type MarketScopeApiDefinition,
  type MarketScopeOption,
} from '../constants/marketScopes'

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

const REQUEST_ID_HEADER = 'x-request-id'
const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'
const REFRESH_IDEMPOTENCY_STORAGE_KEY = 'planting-planner:refresh-idempotency-key'

let refreshIdempotencyKey: string | undefined

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

const randomUUID = (): string => {
  const globalCrypto = globalThis.crypto
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID()
  }
  const random = Math.random().toString(16).slice(2)
  return `${Date.now().toString(16)}-${random}`
}

type RequestResult<T> = {
  readonly data: T
  readonly requestId: string
  readonly response: Response
}

const request = async <T>(input: RequestInfo, init?: RequestInit): Promise<RequestResult<T>> => {
  const requestId = randomUUID()
  const headers = new Headers(init?.headers ?? {})
  headers.set('Content-Type', 'application/json')
  headers.set(REQUEST_ID_HEADER, requestId)

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const data = await parseResponse<T>(response)
  return { data, requestId, response }
}

const MARKET_FALLBACK_HEADER = 'fallback'

const resolveRefreshIdempotencyKey = (): string => {
  if (refreshIdempotencyKey) {
    return refreshIdempotencyKey
  }
  try {
    const storage = globalThis.localStorage
    const stored = storage?.getItem(REFRESH_IDEMPOTENCY_STORAGE_KEY) ?? undefined
    if (stored) {
      refreshIdempotencyKey = stored
      return stored
    }
    const generated = randomUUID()
    storage?.setItem(REFRESH_IDEMPOTENCY_STORAGE_KEY, generated)
    refreshIdempotencyKey = generated
    return generated
  } catch {
    if (!refreshIdempotencyKey) {
      refreshIdempotencyKey = randomUUID()
    }
    return refreshIdempotencyKey
  }
}

export const fetchCrops = async (): Promise<Crop[]> => {
  const url = buildUrl('/crops')
  const { data } = await request<Crop[]>(url)
  return data
}

export interface MarketsResponse {
  readonly markets: MarketScopeOption[]
  readonly generated_at: string
}

type MarketsApiResponse = {
  readonly markets: MarketScopeApiDefinition[]
  readonly generated_at: string
}

export const fetchMarkets = async (): Promise<MarketsResponse> => {
  const url = buildUrl('/markets')
  try {
    const { data: payload } = await request<MarketsApiResponse>(url)
    return {
      generated_at: payload.generated_at,
      markets: payload.markets
        .map(fromMarketScopeApiDefinition)
        .map(toMarketScopeOption),
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
  const { data, response } = await request<RecommendResponse>(url)
  const fallbackHeader = response.headers.get(MARKET_FALLBACK_HEADER)
  const isMarketFallback = typeof fallbackHeader === 'string' && fallbackHeader.toLowerCase() === 'true'
  return { ...data, isMarketFallback }
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
  const { data } = await request<RecommendResponse>(url)
  return data
}

export const postRefresh = async (body?: unknown): Promise<RefreshResponse> => {
  const url = buildUrl('/refresh')
  const init: RequestInit = {
    method: 'POST',
    headers: {
      [IDEMPOTENCY_KEY_HEADER]: resolveRefreshIdempotencyKey(),
    },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  const { data } = await request<RefreshResponse>(url, init)
  return data
}

export const fetchRefreshStatus = async (): Promise<RefreshStatusResponse> => {
  const url = buildUrl('/refresh/status')
  const { data } = await request<RefreshStatusResponse>(url)
  return data
}

export interface PriceSeriesResponse {
  readonly series: PriceSeries
  readonly isMarketFallback: boolean
}

export const fetchPrice = async (
  cropId: number,
  frm?: string,
  to?: string,
  marketScope?: MarketScope,
): Promise<PriceSeriesResponse> => {
  const params = new URLSearchParams({ crop_id: String(cropId) })
  if (frm) params.set('frm', frm)
  if (to) params.set('to', to)
  if (marketScope) params.set('marketScope', marketScope)
  const url = buildUrl('/price', params)
  const { data: series, response } = await request<PriceSeries>(url)
  const fallbackHeader = response.headers.get(MARKET_FALLBACK_HEADER)
  const isMarketFallback = typeof fallbackHeader === 'string' && fallbackHeader.toLowerCase() === 'true'
  return { series, isMarketFallback }
}
