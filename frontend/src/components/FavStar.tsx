import { useCallback, useMemo, useState } from 'react'

import { loadFavorites, saveFavorites } from '../lib/storage'

interface Props {
  active: boolean
  cropName: string
  onToggle: () => void
}

export const FavStar = ({ active, cropName, onToggle }: Props) => {
  const label = active ? `${cropName}をお気に入りから外す` : `${cropName}をお気に入りに追加`
  const baseClasses =
    'inline-flex items-center justify-center text-xl leading-none transition-colors duration-200 bg-transparent border-0 cursor-pointer p-0 hover:text-amber-400 focus-visible:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
  const stateClass = active ? 'text-amber-400' : 'text-slate-300'

  return (
    <button
      type="button"
      className={`${baseClasses} ${stateClass}`}
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
