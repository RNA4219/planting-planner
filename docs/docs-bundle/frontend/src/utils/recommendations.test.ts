import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RecommendResponse } from '../types'
import { normalizeRecommendationResponse } from './recommendations'
import * as weekModule from '../lib/week'

describe('normalizeRecommendationResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('アイテムの播種週・収穫週が不正な場合にレスポンス週へフォールバックする', () => {
    vi.spyOn(weekModule, 'getCurrentIsoWeek').mockReturnValue('2099-W52')

    const response: RecommendResponse = {
      week: '2024-w06',
      region: 'temperate',
      items: [
        {
          crop: 'Spinach',
          sowing_week: 'invalid-week',
          harvest_week: 'not-a-week',
          source: 'test',
          growth_days: 45,
        },
      ],
    }

    const result = normalizeRecommendationResponse(response, '2024-W05')

    expect(result.week).toBe('2024-W06')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      sowing_week: '2024-W06',
      harvest_week: '2024-W06',
    })
  })
})
