export type Region = 'cold' | 'temperate' | 'warm'

export interface Crop {
  id: number
  name: string
  category: string
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

export interface RefreshResponse {
  state: 'success' | 'failure' | 'running' | 'stale'
}

export interface RefreshStatusResponse {
  state: 'success' | 'failure' | 'running' | 'stale'
  started_at: string | null
  finished_at: string | null
  updated_records: number
  last_error: string | null
}

export interface RegionOption {
  label: string
  value: Region
}
