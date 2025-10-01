import { FormEvent, useEffect, useMemo, useState } from 'react'

import { FavStar } from './components/FavStar'
import { RegionSelect } from './components/RegionSelect'
import { fetchCrops, fetchRecommendations, postRefresh } from './lib/api'
import { loadFavorites, loadRegion, saveFavorites, saveRegion } from './lib/storage'
import { compareIsoWeek, formatIsoWeek, getCurrentIsoWeek, normalizeIsoWeek } from './lib/week'
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
  const [queryWeek, setQueryWeek] = useState(() => getCurrentIsoWeek())
  const [activeWeek, setActiveWeek] = useState<string | null>(null)
  const [pendingRequest, setPendingRequest] = useState<{ region: Region; week: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

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
    if (initialized) {
      return
    }
    const normalized = normalizeIsoWeek(queryWeek)
    setQueryWeek(normalized)
    setPendingRequest({ region, week: normalized })
    setInitialized(true)
  }, [initialized, queryWeek, region])

  useEffect(() => {
    if (!pendingRequest) {
      return
    }
    let active = true
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const response = await fetchRecommendations(pendingRequest.region, pendingRequest.week)
        if (!active) return
        const resolvedWeek = normalizeIsoWeek(response.week, pendingRequest.week)
        const normalizedItems = response.items.map((item) => ({
          ...item,
          sowing_week: normalizeIsoWeek(item.sowing_week),
          harvest_week: normalizeIsoWeek(item.harvest_week),
        }))
        setItems(normalizedItems)
        setActiveWeek(resolvedWeek)
        setQueryWeek(resolvedWeek)
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
  }, [pendingRequest])

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
      const weekDiff = compareIsoWeek(a.sowing_week, b.sowing_week)
      if (weekDiff !== 0) {
        return weekDiff
      }
      return a.crop.localeCompare(b.crop, 'ja')
    })
  }, [rows, favorites])

  const handleRegionChange = (next: Region) => {
    setRegion(next)
    saveRegion(next)
    const fallbackWeek = activeWeek ?? getCurrentIsoWeek()
    const normalizedWeek = normalizeIsoWeek(queryWeek, fallbackWeek)
    setQueryWeek(normalizedWeek)
    setPendingRequest({ region: next, week: normalizedWeek })
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fallbackWeek = activeWeek ?? getCurrentIsoWeek()
    const normalizedWeek = normalizeIsoWeek(queryWeek, fallbackWeek)
    setQueryWeek(normalizedWeek)
    setPendingRequest({ region, week: normalizedWeek })
  }

  const handleRefresh = async () => {
    try {
      const response = await postRefresh()
      setRefreshMessage(response.status)
    } catch {
      setRefreshMessage('更新に失敗しました')
    }
  }

  const displayWeek = formatIsoWeek(activeWeek ?? normalizeIsoWeek(queryWeek))

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <form className="app__controls" onSubmit={handleSubmit}>
          <RegionSelect value={region} onChange={handleRegionChange} />
          <label className="app__week" htmlFor="week-input">
            週
            <input
              id="week-input"
              name="week"
              type="text"
              value={queryWeek}
              onChange={(event) => setQueryWeek(event.target.value)}
              placeholder={getCurrentIsoWeek()}
              pattern="\d{4}-W\d{2}"
              inputMode="numeric"
            />
          </label>
          <button type="submit">この条件で見る</button>
          <button className="app__refresh" type="button" onClick={handleRefresh}>
            更新
          </button>
        </form>
      </header>
      <main className="app__main">
        <section className="recommend">
          <div className="recommend__meta">
            <span>対象地域: {REGION_LABEL[region]}</span>
            <span>基準週: {displayWeek}</span>
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
