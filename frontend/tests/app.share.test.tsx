import '@testing-library/jest-dom/vitest'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInteractionsHarness } from './utils/interactionsHarness'
import { TOAST_MESSAGES } from '../src/constants/messages'
import * as shareModule from '../src/lib/share'

const harness = createInteractionsHarness()
const { renderApp, fetchRecommend, fetchRecommendations, fetchCrops } = harness

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>
  clipboard?: Navigator['clipboard'] & { writeText?: (text: string) => Promise<void> }
}

const getNavigator = () => navigator as NavigatorWithShare

const setupInitialMocks = () => {
  fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
  fetchCrops.mockResolvedValue([])
  fetchRecommendations.mockResolvedValue({
    week: '2024-W30',
    region: 'temperate',
    items: [],
    isMarketFallback: false,
  })
}

describe('App share interactions', () => {
  const originalShare = getNavigator().share
  const originalClipboard = getNavigator().clipboard

  afterEach(() => {
    const navigatorRef = getNavigator()
    if (originalShare) {
      Object.defineProperty(navigatorRef, 'share', {
        value: originalShare,
        configurable: true,
        writable: true,
      })
    } else {
      delete navigatorRef.share
    }
    if (originalClipboard) {
      Object.defineProperty(navigatorRef, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      })
    } else {
      delete navigatorRef.clipboard
    }
  })

  it('共有ボタンを描画する', async () => {
    setupInitialMocks()

    await renderApp()

    expect(await screen.findByRole('button', { name: '共有' })).toBeInTheDocument()
  })

  it('navigator.share 対応ブラウザで共有 API を呼び出す', async () => {
    setupInitialMocks()
    const navigatorRef = getNavigator()
    const shareMock = vi.fn<NavigatorWithShare['share']>().mockResolvedValue()
    Object.defineProperty(navigatorRef, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    })
    const writeTextMock = vi.fn<Required<NavigatorWithShare['clipboard']>['writeText']>()

    const { user } = await renderApp()
    const clipboard = navigatorRef.clipboard
    const clipboardSpy =
      clipboard && typeof clipboard.writeText === 'function'
        ? vi.spyOn(clipboard, 'writeText').mockImplementation(writeTextMock)
        : null

    const shareButton = await screen.findByRole('button', { name: '共有' })
    await user.click(shareButton)

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1)
    })
    const call = shareMock.mock.calls[0]?.[0]
    if (!call) {
      throw new Error('share call not captured')
    }
    expect(call.title).toBe('Planting Planner')
    expect(call.text).toContain('地域: 温暖地')
    expect(call.text).toContain('市場: 全国平均')
    expect(call.text).toContain('カテゴリ: 葉菜')
    expect(call.text).toContain('週: 2024-W30')
    const sharedUrl = new URL(call.url)
    expect(sharedUrl.searchParams.get('region')).toBe('temperate')
    expect(sharedUrl.searchParams.get('marketScope')).toBe('national')
    expect(sharedUrl.searchParams.get('category')).toBe('leaf')
    expect(sharedUrl.searchParams.get('week')).toBe('2024-W30')
    expect(writeTextMock).not.toHaveBeenCalled()

    const toast = await screen.findByText(TOAST_MESSAGES.shareSuccess)
    expect(toast.closest('[data-variant="info"]')).not.toBeNull()
    clipboardSpy?.mockRestore()
  })

  it('navigator.share 非対応ブラウザでクリップボードへコピーする', async () => {
    setupInitialMocks()
    const navigatorRef = getNavigator()
    delete navigatorRef.share
    const writeTextMock = vi
      .fn<Required<NavigatorWithShare['clipboard']>['writeText']>()
      .mockResolvedValue(undefined)
    Object.assign(navigatorRef, { clipboard: { writeText: writeTextMock } })
    expect(navigatorRef.clipboard?.writeText).toBe(writeTextMock)

    await shareModule.shareCurrentView({
      region: 'temperate',
      marketScope: 'national',
      category: 'leaf',
      week: '2024-W30',
    })
    expect(writeTextMock).toHaveBeenCalledTimes(1)
    writeTextMock.mockClear()

    const { user } = await renderApp()

    const clipboard = navigatorRef.clipboard
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      throw new Error('clipboard unavailable after render')
    }
    const clipboardSpy = vi
      .spyOn(clipboard, 'writeText')
      .mockImplementation(writeTextMock)

    const shareButton = await screen.findByRole('button', { name: '共有' })
    expect(shareButton).not.toBeDisabled()
    await user.click(shareButton)

    const toast = await screen.findByText(TOAST_MESSAGES.shareCopied)
    expect(toast.closest('[data-variant="info"]')).not.toBeNull()
    expect(writeTextMock).toHaveBeenCalledTimes(1)
    const copiedUrl = writeTextMock.mock.calls[0]?.[0]
    if (!copiedUrl) {
      throw new Error('clipboard call not captured')
    }
    const sharedUrl = new URL(copiedUrl)
    expect(sharedUrl.searchParams.get('region')).toBe('temperate')
    expect(sharedUrl.searchParams.get('marketScope')).toBe('national')
    expect(sharedUrl.searchParams.get('category')).toBe('leaf')
    expect(sharedUrl.searchParams.get('week')).toBe('2024-W30')

    const toastAfter = await screen.findByText(TOAST_MESSAGES.shareCopied)
    expect(toastAfter.closest('[data-variant="info"]')).not.toBeNull()
    clipboardSpy.mockRestore()
  })
})
