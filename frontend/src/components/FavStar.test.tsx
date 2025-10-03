import '@testing-library/jest-dom/vitest'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFavorites } from './FavStar'

const loadFavorites = vi.hoisted(() => vi.fn(() => []))
const saveFavorites = vi.hoisted(() => vi.fn())

vi.mock('../lib/storage', () => ({
  loadFavorites: loadFavorites as unknown,
  saveFavorites: saveFavorites as unknown,
}))

describe('useFavorites', () => {
  beforeEach(() => {
    loadFavorites.mockReturnValue([])
    saveFavorites.mockReset()
  })

  it('cropId=0 でもお気に入り追加・削除できる', () => {
    const { result } = renderHook(() => useFavorites())

    expect(result.current.isFavorite(0)).toBe(false)

    act(() => {
      result.current.toggleFavorite(0)
    })

    expect(saveFavorites).toHaveBeenCalledWith([0])
    expect(result.current.isFavorite(0)).toBe(true)

    act(() => {
      result.current.toggleFavorite(0)
    })

    expect(saveFavorites).toHaveBeenLastCalledWith([])
    expect(result.current.isFavorite(0)).toBe(false)
  })
})
