import { useCallback, useMemo, useState } from 'react'

import { loadFavorites, saveFavorites } from '../lib/storage'

interface Props {
  active: boolean
  cropName: string
  onToggle: () => void
}

export const FAV_STAR_BASE_CLASSES =
  'inline-flex items-center justify-center text-xl leading-none transition-colors duration-200 bg-transparent border-0 cursor-pointer p-0 hover:text-amber-400 focus-visible:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
export const FAV_STAR_BASE_CLASS_LIST = FAV_STAR_BASE_CLASSES.split(' ')
const ACTIVE_CLASS = 'text-amber-400'
const INACTIVE_CLASS = 'text-slate-300'

export const FavStar = ({ active, cropName, onToggle }: Props) => {
  const label = active ? `${cropName}をお気に入りから外す` : `${cropName}をお気に入りに追加`
  const stateClass = active ? ACTIVE_CLASS : INACTIVE_CLASS

  return (
    <button
      type="button"
      className={`${FAV_STAR_BASE_CLASSES} ${stateClass}`}
      aria-pressed={active}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      {active ? '★' : '☆'}
    </button>
  )
}

FavStar.displayName = 'FavStar'

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<number[]>(() => loadFavorites())

  const toggleFavorite = useCallback((cropId?: number) => {
    if (cropId === null || cropId === undefined) {
      return
    }
    setFavorites((prev) => {
      const exists = prev.includes(cropId)
      const next = exists ? prev.filter((id) => id !== cropId) : [...prev, cropId]
      saveFavorites(next)
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (cropId?: number) => (cropId !== undefined ? favorites.includes(cropId) : false),
    [favorites],
  )

  return useMemo(
    () => ({ favorites, toggleFavorite, isFavorite }),
    [favorites, isFavorite, toggleFavorite],
  )
}
