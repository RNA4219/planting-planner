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
}

export interface RecommendResponse {
  week: string
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
