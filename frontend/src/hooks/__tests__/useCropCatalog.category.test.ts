import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Crop } from '../../types'
import { useCropCatalog } from '../useCropCatalog'

const mockCrops: Crop[] = [
  { id: 1, name: 'Spinach', category: 'leaf' },
  { id: 2, name: 'Mystery Fruit', category: 'fruit' },
  { id: 3, name: 'Carrot', category: 'root' },
]

vi.mock('../../lib/api', () => ({
  fetchCrops: vi.fn(() => Promise.resolve(mockCrops)),
}))

describe('useCropCatalog', () => {
  it('不正なカテゴリの作物を catalog から除外する', async () => {
    const { result } = renderHook(() => useCropCatalog())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const entries = Array.from(result.current.catalog.values())
    const categories = new Set(entries.map((entry) => entry.category))

    expect(entries.some((entry) => entry.name === 'Mystery Fruit')).toBe(false)
    expect(categories.size).toBeGreaterThan(0)
    categories.forEach((category) => {
      expect(['leaf', 'root', 'flower']).toContain(category)
    })
  })
})
