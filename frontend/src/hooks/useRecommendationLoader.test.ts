import { describe, expect, it } from 'vitest'

import { normalizeWeekInput } from './useRecommendationLoader'

describe('normalizeWeekInput', () => {
  it.each([
    ['2024-W6', '2024-W06'],
    ['W6 2024', '2024-W06'],
    ['2024W06', '2024-W06'],
    ['2024-07-01', '2024-W27'],
    ['2024/07/01', '2024-W27'],
    ['2024.07.01', '2024-W27'],
    ['2024年7月1日', '2024-W27'],
    ['2024年第六週', '2024-W06'],
    ['第六週 2024年', '2024-W06'],
  ])('入力 %s は %s へ正規化される', (input, expected) => {
    expect(normalizeWeekInput(input, '2024-W05')).toBe(expected)
  })

  it('日付として解釈できない場合は activeWeek を返す', () => {
    expect(normalizeWeekInput('invalid', '2024-W05')).toBe('2024-W05')
  })
})
