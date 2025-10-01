import type {
  Crop,
  RecommendResponse,
  RefreshResponse,
  RefreshStatusResponse,
  Region,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

const buildUrl = (path: string, searchParams?: URLSearchParams): string => {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, 'http://localhost')
  url.pathname = `${API_BASE.replace(/\/$/, '')}${url.pathname}`
  if (searchParams) {
    url.search = searchParams.toString()
  }
  return url.pathname + url.search
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
  week?: number,
): Promise<RecommendResponse> => {
  const params = new URLSearchParams({ region })
  if (typeof week === 'number') {
    params.set('week', String(week))
  }
  const url = buildUrl('/recommend', params)
  return request<RecommendResponse>(url)
}

export const triggerRefresh = async (): Promise<RefreshResponse> => {
  const url = buildUrl('/refresh')
  return request<RefreshResponse>(url, { method: 'POST' })
}

export const fetchRefreshStatus = async (): Promise<RefreshStatusResponse> => {
  const url = buildUrl('/refresh/status')
  return request<RefreshStatusResponse>(url)
}
