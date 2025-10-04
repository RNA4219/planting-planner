import type {
  Crop,
  PriceSeries,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from '../types'

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

const request = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const fetchCrops = async (): Promise<Crop[]> => {
  const url = buildUrl('/crops')
  return request<Crop[]>(url)
}

export const fetchRecommendations = async (
  region: Region,
  week?: string,
): Promise<RecommendResponse> => {
  const params = new URLSearchParams({ region })
  if (week) {
    params.set('week', week)
  }
  const url = buildUrl('/recommend', params)
  return request<RecommendResponse>(url)
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
): Promise<PriceSeries> => {
  const params = new URLSearchParams({ crop_id: String(cropId) })
  if (frm) params.set('frm', frm)
  if (to) params.set('to', to)
  const url = buildUrl('/price', params)
  return request<PriceSeries>(url)
}
