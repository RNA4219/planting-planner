import { useEffect, useMemo, useState } from 'react'

import { FavStar } from './components/FavStar'
import { RegionSelect } from './components/RegionSelect'
import { fetchCrops, fetchRecommendations, triggerRefresh } from './lib/api'
import { loadFavorites, loadRegion, saveFavorites, saveRegion } from './lib/storage'
import { formatIsoWeek, getCurrentIsoWeek } from './lib/week'
import type { Crop, RecommendationItem, Region } from './types'
import './App.css'

type RecommendationRow = RecommendationItem & { cropId?: number }

const REGION_LABEL: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

export const App = () => {
  const [region, setRegion] = useState<Region>(() => loadRegion())
  const [favorites, setFavorites] = useState<number[]>(() => loadFavorites())
  const [crops, setCrops] = useState<Crop[]>([])
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [week, setWeek] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [currentWeek] = useState(() => getCurrentIsoWeek())

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetchCrops()
        if (!active) return
        setCrops(response)
      } catch {
        if (!active) return
        setError('作物一覧の取得に失敗しました')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const response = await fetchRecommendations(region, currentWeek)
        if (!active) return
        setWeek(response.week)
        setItems(response.items)
      } catch {
        if (!active) return
        setError('推奨データの取得に失敗しました')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [region, currentWeek])

  const cropIndex = useMemo(() => {
    const map = new Map<string, number>()
    crops.forEach((crop) => {
      map.set(crop.name, crop.id)
    })
    return map
  }, [crops])

  const rows: RecommendationRow[] = useMemo(
    () => items.map((item) => ({ ...item, cropId: cropIndex.get(item.crop) })),
    [items, cropIndex],
  )

  const sortedRows = useMemo(() => {
    const favoriteSet = new Set(favorites)
    return [...rows].sort((a, b) => {
      const aFav = a.cropId !== undefined && favoriteSet.has(a.cropId) ? 1 : 0
      const bFav = b.cropId !== undefined && favoriteSet.has(b.cropId) ? 1 : 0
      if (aFav !== bFav) {
        return bFav - aFav
      }
      if (a.sowing_week !== b.sowing_week) {
        return a.sowing_week - b.sowing_week
      }
      return a.crop.localeCompare(b.crop, 'ja')
    })
  }, [rows, favorites])

  const handleRegionChange = (next: Region) => {
    setRegion(next)
    saveRegion(next)
  }

  const toggleFavorite = (cropId?: number) => {
    if (!cropId) return
    setFavorites((prev) => {
      const exists = prev.includes(cropId)
      const nextFavorites = exists ? prev.filter((id) => id !== cropId) : [...prev, cropId]
      saveFavorites(nextFavorites)
      return nextFavorites
    })
  }

  const handleRefresh = async () => {
    try {
      const response = await triggerRefresh()
      setRefreshMessage(response.status)
    } catch {
      setRefreshMessage('更新に失敗しました')
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <div className="app__controls">
          <RegionSelect value={region} onChange={handleRegionChange} />
          <button className="app__refresh" type="button" onClick={handleRefresh}>
            更新
          </button>
        </div>
      </header>
      <main className="app__main">
        <section className="recommend">
          <div className="recommend__meta">
            <span>対象地域: {REGION_LABEL[region]}</span>
            <span>基準週: {week ? formatIsoWeek(week) : formatIsoWeek(currentWeek)}</span>
          </div>
          {refreshMessage && <p className="recommend__status">{refreshMessage}</p>}
          {error && (
            <p role="alert" className="recommend__error">
              {error}
            </p>
          )}
          <table className="recommend__table">
            <thead>
              <tr>
                <th scope="col">作物</th>
                <th scope="col">播種週</th>
                <th scope="col">収穫週</th>
                <th scope="col">情報源</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((item) => {
                const favorite = item.cropId !== undefined && favorites.includes(item.cropId)
                return (
                  <tr key={`${item.crop}-${item.sowing_week}-${item.harvest_week}`}>
                    <td>
                      <div className="recommend__crop">
                        <FavStar active={favorite} cropName={item.crop} onToggle={() => toggleFavorite(item.cropId)} />
                        <span>{item.crop}</span>
                      </div>
                    </td>
                    <td>{formatIsoWeek(item.sowing_week)}</td>
                    <td>{formatIsoWeek(item.harvest_week)}</td>
                    <td>{item.source}</td>
                  </tr>
                )
              })}
              {!loading && sortedRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="recommend__empty">
                    推奨データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <p className="recommend__loading">読み込み中...</p>}
        </section>
      </main>
    </div>
  )
}

export default App
