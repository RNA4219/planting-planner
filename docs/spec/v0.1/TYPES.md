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
export interface Recommendation {
  crop: string
  harvest_week: number
  sowing_week: number
  source: string
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
  week: number
  region: Region
  items: Recommendation[]
}

export interface RefreshResponse {
  status: string
}

export interface RefreshStatusResponse {
  last_run: string
  status: "success" | "failure" | "running" | "stale"
  updated_records: number
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
