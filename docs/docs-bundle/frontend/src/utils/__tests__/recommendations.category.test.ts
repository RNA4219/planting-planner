import { describe, expect, it } from 'vitest'

import type { CropCategory } from '../../types'
import { buildRecommendationRows } from '../recommendations'

describe('buildRecommendationRows', () => {
  it('カテゴリが列挙外の場合は undefined に落とす', () => {
    const cropIndex = new Map<string, { id: number; category?: CropCategory }>([
      ['Spinach', { id: 1, category: 'leaf' }],
      ['Mystery Crop', { id: 2, category: 'alien' as unknown as CropCategory }],
    ])

    const rows = buildRecommendationRows({
      items: [
        {
          crop: 'Spinach',
          sowing_week: '2024-W10',
          harvest_week: '2024-W20',
          source: 'test',
          growth_days: 70,
        },
        {
          crop: 'Mystery Crop',
          sowing_week: '2024-W11',
          harvest_week: '2024-W21',
          source: 'test',
          growth_days: 65,
        },
      ],
      favorites: [],
      cropIndex,
    })

    expect(rows).toHaveLength(2)
    const spinach = rows.find((row) => row.crop === 'Spinach')
    const mystery = rows.find((row) => row.crop === 'Mystery Crop')

    expect(spinach?.category).toBe('leaf')
    expect(mystery?.category).toBeUndefined()
  })
})
