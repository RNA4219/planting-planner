import { useEffect, useMemo, useState } from 'react'

import * as apiModule from '../lib/api'
import type { Crop } from '../types'

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
        category: crop.category,
      })
    })
    return map
  }, [crops])

  return { catalog, isLoading }
}
