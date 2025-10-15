import { useEffect, useMemo, useState } from 'react'

import * as apiModule from '../lib/api'
import type { Crop, CropCategory } from '../types'
import { isCropCategory } from '../utils/recommendations'

const api = apiModule as typeof import('../lib/api') & {
  fetchCrops?: () => Promise<Crop[]>
}

export interface CropCatalogEntry {
  id: number
  name: string
  category: string
}

export type CropCatalogMap = Map<string, CropCatalogEntry>

export interface UseCropCatalogResult {
  catalog: CropCatalogMap
  isLoading: boolean
}

const fetchCrops = api.fetchCrops

const JAPANESE_CATEGORY_MAP: Record<string, CropCategory> = {
  葉菜: 'leaf',
  葉菜類: 'leaf',
  根菜: 'root',
  根菜類: 'root',
  花菜: 'flower',
  花菜類: 'flower',
}

const normalizeCropCategory = (category: string): string => {
  const trimmed = category.trim()
  if (trimmed === '') {
    return trimmed
  }

  const normalized = trimmed.normalize('NFKC')
  const lower = normalized.toLowerCase()

  if (isCropCategory(lower)) {
    return lower
  }

  const mapped = JAPANESE_CATEGORY_MAP[lower] ?? JAPANESE_CATEGORY_MAP[normalized]
  if (mapped !== undefined) {
    return mapped
  }

  return normalized
}

export const useCropCatalog = (): UseCropCatalogResult => {
  const [crops, setCrops] = useState<Crop[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (typeof fetchCrops !== 'function') {
        if (active) {
          setCrops([])
          setIsLoading(false)
        }
        return
      }
      try {
        setIsLoading(true)
        const response = await fetchCrops()
        if (active) {
          setCrops(response)
        }
      } catch {
        if (active) {
          setCrops([])
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const catalog = useMemo<CropCatalogMap>(() => {
    const map: CropCatalogMap = new Map()
    crops.forEach((crop) => {
      map.set(crop.name, {
        id: crop.id,
        name: crop.name,
        category: normalizeCropCategory(crop.category),
      })
    })
    return map
  }, [crops])

  return { catalog, isLoading }
}
