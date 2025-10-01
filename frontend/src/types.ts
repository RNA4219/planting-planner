export type Region = 'cold' | 'temperate' | 'warm'

export interface Crop {
  id: number
  name: string
  category: string
}

export interface RecommendationItem {
  crop: string
  sowing_week: number
  harvest_week: number
  source: string
}

export interface RecommendResponse {
  week: number
  region: Region
  items: RecommendationItem[]
}

export interface RefreshResponse {
  status: string
}

export interface RefreshStatusResponse {
  last_run: string
  status: 'success' | 'failure' | 'running' | 'stale'
  updated_records: number
}

export interface RegionOption {
  label: string
  value: Region
}
