import { useEffect, useMemo, useState } from 'react'

import * as apiModule from '../lib/api'
import { isCropCategory, type Crop, type CropCategory } from '../types'

const CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: '葉菜類',
  root: '根菜類',
  flower: '花き',
}

const JAPANESE_CATEGORY_MAP: Record<string, CropCategory> = {
  葉菜: 'leaf',
  葉菜類: 'leaf',
  果菜: 'leaf',
  果菜類: 'leaf',
  根菜: 'root',
  根菜類: 'root',
  花き: 'flower',
  花き類: 'flower',
}

const normalizeCropCategory = (
  value: unknown,
): { category: CropCategory; displayLabel: string } | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (isCropCategory(trimmed)) {
    return {
      category: trimmed,
      displayLabel: CATEGORY_LABELS[trimmed] ?? trimmed,
    }
  }
  const mapped = JAPANESE_CATEGORY_MAP[trimmed]
  if (!mapped) {
    return null
  }
  return {
    category: mapped,
    displayLabel: trimmed,
  }
}

const api = apiModule as typeof import('../lib/api') & {
  fetchCrops?: () => Promise<Crop[]>
}

export interface CropCatalogEntry {
  id: number
  name: string
  category: CropCategory
  displayCategory: string
}

export type CropCatalogMap = Map<string, CropCatalogEntry>

export interface UseCropCatalogResult {
  catalog: CropCatalogMap
  isLoading: boolean
}

const fetchCrops = api.fetchCrops

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
      const normalized = normalizeCropCategory(crop.category)
      if (!normalized) {
        return
      }
      map.set(crop.name, {
        id: crop.id,
        name: crop.name,
        category: normalized.category,
        displayCategory: normalized.displayLabel,
      })
    })
    return map
  }, [crops])

  return { catalog, isLoading }
}
