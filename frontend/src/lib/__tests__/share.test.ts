import { afterEach, describe, expect, it, vi } from 'vitest'

import { shareCurrentView } from '../share'

describe('shareCurrentView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.documentElement.lang = 'ja'
  })

  const context = {
    region: 'temperate',
    marketScope: 'national',
    category: 'leaf',
    week: '2024-W10',
  } as const

  it('builds Japanese share text when lang is ja', async () => {
    document.documentElement.lang = 'ja'
    const shareMock = vi.fn(() => Promise.resolve())

    vi.stubGlobal('navigator', {
      share: shareMock,
    })

    const result = await shareCurrentView(context)

    expect(result).toBe('success')
    expect(shareMock).toHaveBeenCalledTimes(1)
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '地域: 温暖地 / 市場: 全国平均 / カテゴリ: 葉菜類 / 週: 2024-W10',
      }),
    )
  })

  it('builds English share text when lang is en', async () => {
    document.documentElement.lang = 'en'
    const shareMock = vi.fn(() => Promise.resolve())

    vi.stubGlobal('navigator', {
      share: shareMock,
    })

    const result = await shareCurrentView(context)

    expect(result).toBe('success')
    expect(shareMock).toHaveBeenCalledTimes(1)
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Region: Temperate region / Market: National average / Category: Leafy vegetables / Week: 2024-W10',
      }),
    )
  })
})
