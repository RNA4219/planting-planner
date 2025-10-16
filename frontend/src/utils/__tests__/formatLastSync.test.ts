import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatLastSync } from '../formatLastSync'

const FIXED_DATE = new Date('2024-05-01T13:00:00Z')

describe('formatLastSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_DATE)
  })
  afterEach(() => {
    vi.useRealTimers()
    document.documentElement.lang = ''
  })

  it('日本語ロケールで日時を yyyy/MM/dd HH:mm 形式に整形する', () => {
    document.documentElement.lang = 'ja'
    expect(formatLastSync(FIXED_DATE)).toBe('2024/05/01 13:00')
  })

  it('英語ロケールで日時を mm/dd/yyyy, HH:mm 形式に整形する', () => {
    document.documentElement.lang = 'en'
    expect(formatLastSync(FIXED_DATE)).toBe('05/01/2024, 13:00')
  })

  it('未知時は引数で受け取ったラベルをそのまま返す', () => {
    document.documentElement.lang = 'en'
    expect(formatLastSync(null, 'Not synced')).toBe('Not synced')
  })
})
