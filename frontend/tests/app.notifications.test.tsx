import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { TOAST_MESSAGES } from '../src/constants/messages'
import { useAppNotifications } from '../src/app/useAppNotifications'
import type { ToastStackItem } from '../src/components/ToastStack'
import { useRefreshStatusController } from '../src/hooks/refresh/controller'

vi.mock('../src/hooks/refresh/controller', () => ({
  useRefreshStatusController: vi.fn(),
}))

const useRefreshStatusControllerMock = vi.mocked(useRefreshStatusController)

describe('useAppNotifications', () => {
  afterEach(() => {
    useRefreshStatusControllerMock.mockReset()
  })

  test('マーケットフォールバック時にトーストを1件だけ表示し続ける', async () => {
    const reloadCurrentWeek = vi.fn()
    const startRefresh = vi.fn()
    const dismissToast = vi.fn()
    const pendingToastsRef: { current: ToastStackItem[] } = { current: [] }

    useRefreshStatusControllerMock.mockImplementation(() => ({
      isRefreshing: false,
      startRefresh,
      pendingToasts: pendingToastsRef.current,
      dismissToast,
    }))

    const { result, rerender } = renderHook(() =>
      useAppNotifications({ reloadCurrentWeek, isMarketFallback: true }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.combinedToasts).toHaveLength(1)
    const [initialToast] = result.current.combinedToasts
    expect(initialToast.variant).toBe('warning')
    expect(initialToast.message).toBe(TOAST_MESSAGES.recommendationFallbackWarning)

    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        rerender()
      })
      expect(result.current.combinedToasts).toHaveLength(1)
      const [currentToast] = result.current.combinedToasts
      expect(currentToast.id).toBe(initialToast.id)
      expect(currentToast.variant).toBe('warning')
    }

    const successToast: ToastStackItem = {
      id: 'success-toast',
      variant: 'success',
      message: 'ok',
      detail: null,
    }
    pendingToastsRef.current = [successToast]

    await act(async () => {
      rerender()
    })

    expect(result.current.combinedToasts).toHaveLength(2)
    const [firstToast, secondToast] = result.current.combinedToasts
    expect(firstToast).toBe(successToast)
    expect(secondToast.id).toBe(initialToast.id)
    expect(secondToast.variant).toBe('warning')

    await act(async () => {
      rerender()
    })
    expect(result.current.combinedToasts).toHaveLength(2)
    const [, latestFallback] = result.current.combinedToasts
    expect(latestFallback.id).toBe(initialToast.id)

    await act(async () => {
      result.current.handleToastDismiss(initialToast.id)
    })

    expect(result.current.combinedToasts).toHaveLength(2)
    let [successAfterDismiss, restoredFallback] = result.current.combinedToasts
    expect(successAfterDismiss).toBe(successToast)
    expect(restoredFallback.id).not.toBe(initialToast.id)
    expect(restoredFallback.variant).toBe('warning')
    expect(restoredFallback.message).toBe(TOAST_MESSAGES.recommendationFallbackWarning)

    await act(async () => {
      rerender()
    })

    expect(result.current.combinedToasts).toHaveLength(2)
    ;[successAfterDismiss, restoredFallback] = result.current.combinedToasts
    expect(successAfterDismiss).toBe(successToast)
    expect(restoredFallback.variant).toBe('warning')
    expect(restoredFallback.message).toBe(TOAST_MESSAGES.recommendationFallbackWarning)
  })
})
