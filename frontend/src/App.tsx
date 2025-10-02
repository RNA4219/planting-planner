
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FavStar, useFavorites } from './components/FavStar'
import { PriceChart } from './components/PriceChart'
import { RegionSelect } from './components/RegionSelect'
import { fetchCrops, fetchRecommendations, postRefresh } from './lib/api'
import { loadRegion } from './lib/storage'
import { compareIsoWeek, formatIsoWeek, getCurrentIsoWeek, normalizeIsoWeek } from './lib/week'
import type { RecommendationRow } from './hooks/useRecommendations'
import type { Crop, RecommendationItem, Region } from './types'

import './App.css'

const REGION_LABEL: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

export const App = () => {
  const currentWeekRef = useRef(getCurrentIsoWeek())
  const [region, setRegion] = useState<Region>(() => loadRegion())
  const [queryWeek, setQueryWeek] = useState(currentWeekRef.current)
  const [activeWeek, setActiveWeek] = useState(() => normalizeIsoWeek(getCurrentIsoWeek()))
  const [items, setItems] = useState<RecommendationItem[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [refreshFailed, setRefreshFailed] = useState(false)
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
      .map<RecommendationRow>((item) => {
        const cropId = cropIndex.get(item.crop)
        return {
          ...item,
          cropId,
          rowKey: `${item.crop}-${item.sowing_week}-${item.harvest_week}`,
          sowingWeekLabel: formatIsoWeek(item.sowing_week),
          harvestWeekLabel: formatIsoWeek(item.harvest_week),
        }
      })
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
    async (targetRegion: Region, inputWeek: string, fallbackWeek: string) => {
      const normalizedWeek = normalizeIsoWeek(inputWeek, fallbackWeek)
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
    [],
  )

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    void requestRecommendations(region, queryWeek, activeWeek)
  }, [requestRecommendations, region, queryWeek, activeWeek])

  const handleWeekChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQueryWeek(normalizeIsoWeek(event.target.value, currentWeekRef.current))
  }, [])

  const displayWeek = useMemo(() => formatIsoWeek(activeWeek), [activeWeek])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void requestRecommendations(region, queryWeek, activeWeek)
  }

  const handleRegionChange = useCallback((next: Region) => {
    setRegion(next)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshFailed(false)
    try {
      await postRefresh()
      setRefreshMessage('更新リクエストを受け付けました。自動ステータス更新は未実装です。')
      setRefreshFailed(false)
    } catch {
      setRefreshMessage('更新リクエストに失敗しました。自動ステータス更新は未実装です。')
      setRefreshFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

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
              onChange={handleWeekChange}
              placeholder={currentWeekRef.current}
              pattern="\d{4}-W\d{2}"
              inputMode="numeric"
            />
          </label>
          <button type="submit">この条件で見る</button>
          <button className="app__refresh" type="button" onClick={() => void handleRefresh()} disabled={refreshing}>
            更新
          </button>
        </form>
      </header>
      <main className="app__main">
        {refreshMessage && (
          <div
            className={`app__refresh-message${refreshFailed ? ' app__refresh-message--error' : ''}`}
            role={refreshFailed ? 'alert' : 'status'}
          >
            {refreshMessage}
          </div>
        )}
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
              {sortedRows.map((item) => {
                const isSelected = item.cropId !== undefined && item.cropId === selectedCropId
                return (
                  <tr
                    key={item.rowKey}
                    className={`recommend__row${isSelected ? ' recommend__row--selected' : ''}`}
                    onClick={() => setSelectedCropId(item.cropId ?? null)}
                  >
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
                  <td>{item.sowingWeekLabel}</td>
                  <td>{item.harvestWeekLabel}</td>
                  <td>{item.source}</td>
                </tr>
                )
              })}
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
        <section className="recommend__chart">
          <h2>価格推移</h2>
          <PriceChart cropId={selectedCropId} range={{ from: undefined, to: undefined }} />
          <p className="recommend__chart-hint">作物一覧で行をクリックすると、価格推移が表示されます。</p>
        </section>
      </main>
    </div>
  )
}

export default App
