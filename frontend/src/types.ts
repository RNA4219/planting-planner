export type Region = 'cold' | 'temperate' | 'warm'

export interface Crop {
  id: number
  name: string
  category: string
  variety?: string
}

/** 作物の生育期間メタデータ */
export interface GrowthDays {
  crop_id: number
  region: Region
  days: number
}

/** 作物一覧 API レスポンス */
export type CropsResponse = Crop[]

/** ヘルスチェック API レスポンス */
export interface HealthResponse {
  status: string
}

export interface RecommendationItem {
  crop: string
  sowing_week: string
  harvest_week: string
  source: string
  /** 播種から収穫までの推定日数 */
  growth_days: number
}

export interface RecommendResponse {
  week: string
  region: Region
  items: RecommendationItem[]
}

export type RefreshState = 'success' | 'failure' | 'running' | 'stale'

export interface RefreshResponse {
  state: RefreshState
}

export interface RefreshStatusResponse {
  state: RefreshState
  started_at: string | null
  finished_at: string | null
  updated_records: number
  last_error: string | null
}

export interface RefreshStatus {
  state: RefreshState
  startedAt: string | null
  finishedAt: string | null
  updatedRecords: number
  lastError: string | null
}

export interface RegionOption {
  label: string
  value: Region
}

export interface PricePoint {
  week: string
  avg_price: number | null
  stddev: number | null
}

export interface PriceSeries {
  crop_id: number
  crop: string
  unit: string
  source: string
  prices: PricePoint[]
}

/** 地域設定を保存するストレージ構造 */
export interface RegionStorage {
  region: Region
}

/** お気に入り作物IDを保存するストレージ構造 */
export interface FavoritesStorage {
  favorites: number[]
}

export interface SearchFilter {
  keyword: string
}
