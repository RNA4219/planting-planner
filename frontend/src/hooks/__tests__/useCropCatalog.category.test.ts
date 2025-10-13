import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Crop } from '../../types'
import { renderHookWithQueryClient } from '../../../tests/utils/renderHookWithQueryClient'

import { useCropCatalog } from '../useCropCatalog'

const { fetchCropsMock } = vi.hoisted(() => ({
  fetchCropsMock: vi.fn<() => Promise<Crop[]>>(),
}))

vi.mock('../../lib/api', () => ({
  fetchCrops: fetchCropsMock,
}))

describe('useCropCatalog category normalization', () => {
  beforeEach(() => {
    fetchCropsMock.mockReset()
  })

  it('正規化後も大文字カテゴリがカタログへ保持される', async () => {
    const crops = [
      { id: 1, name: 'Upper Leaf', category: 'LEAF' },
      { id: 2, name: 'Japanese Leaf', category: '葉菜類' },
      { id: 3, name: 'Trimmed Root', category: ' root ' },
    ] satisfies Array<Omit<Crop, 'category'> & { category: string }>
    fetchCropsMock.mockResolvedValueOnce(crops as unknown as Crop[])

    const { result } = renderHookWithQueryClient(() => useCropCatalog())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.catalog.get('Upper Leaf')?.category).toBe('leaf')
    expect(result.current.catalog.get('Japanese Leaf')?.category).toBe('leaf')
    expect(result.current.catalog.get('Trimmed Root')?.category).toBe('root')
  })
})
