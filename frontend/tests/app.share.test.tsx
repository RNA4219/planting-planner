import '@testing-library/jest-dom/vitest'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'

import { createInteractionsHarness } from './utils/interactionsHarness'

const harness = createInteractionsHarness()
const { renderApp, fetchRecommend, fetchRecommendations, fetchCrops } = harness

const setupCommonMocks = () => {
  fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
  fetchCrops.mockResolvedValue([])
  fetchRecommendations.mockResolvedValue({
    week: '2024-W30',
    region: 'temperate',
    items: [],
    isMarketFallback: false,
  })
}

describe('App share', () => {
  beforeEach(() => {
    setupCommonMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('シェアボタンを表示する', async () => {
    const { user } = await renderApp()
    await screen.findByLabelText('地域')

    const shareButton = screen.getByRole('button', { name: '共有' })
    expect(shareButton).toBeInTheDocument()
    await user.click(shareButton)
  })

  test('Web Share API 対応ブラウザでは期待したデータで navigator.share を呼び出す', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    })

    const { user } = await renderApp()
    const shareButton = await screen.findByRole('button', { name: '共有' })

    await user.click(shareButton)

    expect(shareMock).toHaveBeenCalledWith({
      title: 'Planting Planner',
      text: '地域: 温暖地 / 市場: 全国平均 / カテゴリ: 葉菜類 / 週: 2024-W30',
      url: expect.stringContaining('region=temperate&marketScope=national&category=leaf&week=2024-W30'),
    })

    await waitFor(() => {
      expect(
        screen.getByText('共有リンクを送信しました'),
      ).toBeVisible()
    })
  })

  test('Web Share API 非対応ブラウザではクリップボードコピーにフォールバックする', async () => {
    Object.defineProperty(window.navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const existingClipboard = window.navigator.clipboard
    const writeText = existingClipboard
      ? vi.spyOn(existingClipboard, 'writeText').mockResolvedValue(undefined)
      : vi.fn().mockResolvedValue(undefined)
    if (!existingClipboard) {
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
        writable: true,
      })
    }

    const { user } = await renderApp()
    const shareButton = await screen.findByRole('button', { name: '共有' })

    expect(window.navigator.clipboard).toBeDefined()
    expect(shareButton).not.toBeDisabled()

    await user.click(shareButton)

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('region=temperate&marketScope=national&category=leaf&week=2024-W30'),
    )

    await waitFor(() => {
      expect(
        screen.getByText('共有リンクをコピーしました'),
      ).toBeVisible()
    })
  })
})
