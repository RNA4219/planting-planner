# TypeScript 型定義 - planting-planner v0.1

## 共通型

```ts
export type Region = "cold" | "temperate" | "warm"
```

---

## 作物関連

```ts
export interface Crop {
  id: number
  name: string
  category: "leaf" | "root" | "fruit" | "flower" | string
}

export interface GrowthDays {
  crop_id: number
  region: Region
  days: number
}
```

---

## 推奨結果

```ts
export interface RecommendationItem {
  crop: string
  harvest_week: string
  sowing_week: string
  source: string
  growth_days: number
}
```

---

## API レスポンス

```ts
export interface HealthResponse {
  status: string
}

export type CropsResponse = Crop[]

export interface RecommendResponse {
  week: string
  region: Region
  items: RecommendationItem[]
}

export interface RefreshResponse {
  state: "success" | "failure" | "running" | "stale"
  started_at?: string | null
  finished_at?: string | null
  updated_records?: number
  last_error?: string | null
}

export interface RefreshStatusResponse {
  state: "success" | "failure" | "running" | "stale"
  started_at: string | null
  finished_at: string | null
  updated_records: number
  last_error: string | null
}
```

---

## localStorage

```ts
export interface FavoritesStorage {
  favorites: number[] // crop.id の配列
}

export interface RegionStorage {
  region: Region
}
```
