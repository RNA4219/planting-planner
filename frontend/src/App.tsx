import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { FavStar, useFavorites } from './components/FavStar'
import { RegionSelect } from './components/RegionSelect'
import { fetchCrops, fetchRecommendations, postRefresh } from './lib/api'
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
  const [region, setRegion] = useState<Region>('temperate')
  const [queryWeek, setQueryWeek] = useState(() => getCurrentIsoWeek())
  const [activeWeek, setActiveWeek] = useState(() => normalizeIsoWeek(getCurrentIsoWeek()))
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetchCrops()
        if (active) {
          setCrops(response)
        }
      } catch {
        if (active) {
          setCrops([])
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const cropIndex = useMemo(() => {
    const map = new Map<string, number>()
    crops.forEach((crop) => {
      map.set(crop.name, crop.id)
    })
    return map
  }, [crops])

  const sortedRows = useMemo<RecommendationRow[]>(() => {
    const favoriteSet = new Set(favorites)
    return items
      .map((item) => ({
        ...item,
        cropId: cropIndex.get(item.crop),
      }))
      .sort((a, b) => {
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
  }, [items, cropIndex, favorites])

  const requestRecommendations = useCallback(
    async (targetRegion: Region, inputWeek: string) => {
      const normalizedWeek = normalizeIsoWeek(inputWeek, activeWeek)
      setQueryWeek(normalizedWeek)
      try {
        const response = await fetchRecommendations(targetRegion, normalizedWeek)
        const resolvedWeek = normalizeIsoWeek(response.week, normalizedWeek)
        const normalizedItems = response.items.map((item) => ({
          ...item,
          sowing_week: normalizeIsoWeek(item.sowing_week),
          harvest_week: normalizeIsoWeek(item.harvest_week),
        }))
        setItems(normalizedItems)
        setActiveWeek(resolvedWeek)
      } catch {
        setItems([])
      }
    },
    [activeWeek],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void requestRecommendations(region, queryWeek)
  }

  const handleRegionChange = useCallback((next: Region) => {
    setRegion(next)
  }, [])

  const handleRefresh = useCallback(() => {
    void postRefresh()
  }, [])

  const displayWeek = formatIsoWeek(activeWeek)

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Planting Planner</h1>
        <form className="app__controls" onSubmit={handleSubmit}>
          <RegionSelect onChange={handleRegionChange} />
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
              {sortedRows.map((item) => (
                <tr key={`${item.crop}-${item.sowing_week}-${item.harvest_week}`}>
                  <td>
                    <div className="recommend__crop">
                      <FavStar
                        active={isFavorite(item.cropId)}
                        cropName={item.crop}
                        onToggle={() => toggleFavorite(item.cropId)}
                      />
                      <span>{item.crop}</span>
                    </div>
                  </td>
                  <td>{formatIsoWeek(item.sowing_week)}</td>
                  <td>{formatIsoWeek(item.harvest_week)}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="recommend__empty">
                    推奨データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}

export default App
